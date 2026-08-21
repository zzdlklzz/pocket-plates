do $$
begin
  if exists (
    select 1
    from public.grocery_lists
    where source_type = 'recipes'::public.grocery_list_source_type
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cannot add frozen recipe counts: existing recipe-generated grocery lists have unrecoverable selection history.';
  end if;
end;
$$;

alter table public.grocery_lists
add column source_recipe_count int not null default 0,
add constraint grocery_lists_source_recipe_count_check
check (
  (
    source_type = 'recipes'::public.grocery_list_source_type
    and source_recipe_count between 1 and 10
  )
  or (
    source_type <> 'recipes'::public.grocery_list_source_type
    and source_recipe_count = 0
  )
);

create function public.protect_grocery_list_source_recipe_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source_recipe_count is distinct from old.source_recipe_count then
    raise insufficient_privilege using
      message = 'Grocery list source recipe count is immutable.';
  end if;

  return new;
end;
$$;

create trigger protect_grocery_list_source_recipe_count_before_update
before update on public.grocery_lists
for each row execute function public.protect_grocery_list_source_recipe_count();

revoke execute on function public.protect_grocery_list_source_recipe_count()
from public, anon, authenticated;

drop function public.list_grocery_lists();

create function public.list_grocery_lists()
returns table (
  id uuid,
  title text,
  source_type public.grocery_list_source_type,
  source_week_start_date date,
  source_recipe_count int,
  meal_plan_available boolean,
  checked_item_count int,
  item_count int,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    grocery_list.id,
    grocery_list.title,
    grocery_list.source_type,
    grocery_list.source_week_start_date,
    grocery_list.source_recipe_count,
    grocery_list.source_type = 'meal_plan'::public.grocery_list_source_type
      and grocery_list.meal_plan_id is not null
      and exists (
        select 1
        from public.meal_plans
        where meal_plans.id = grocery_list.meal_plan_id
          and meal_plans.owner_id = (select auth.uid())
      ) as meal_plan_available,
    count(grocery_list_item.id) filter (where grocery_list_item.checked)::int,
    count(grocery_list_item.id)::int,
    grocery_list.updated_at
  from public.grocery_lists as grocery_list
  left join public.grocery_list_items as grocery_list_item
    on grocery_list_item.grocery_list_id = grocery_list.id
  where grocery_list.owner_id = (select auth.uid())
  group by grocery_list.id
  order by grocery_list.updated_at desc, grocery_list.id;
$$;

revoke all on function public.list_grocery_lists() from public, anon;
grant execute on function public.list_grocery_lists() to authenticated;

create or replace function public.create_grocery_list_with_items(
  p_title text,
  p_source_type public.grocery_list_source_type,
  p_meal_plan_id uuid,
  p_source_week_start_date date,
  p_items jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  authenticated_owner_id uuid := auth.uid();
  created_list_id uuid;
  created_item_id uuid;
  created_source_recipe_count int;
  item_record record;
begin
  if authenticated_owner_id is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if char_length(btrim(p_title)) not between 1 and 80 then
    raise invalid_parameter_value using message = 'Grocery list title is invalid.';
  end if;

  if p_source_type = 'meal_plan'::public.grocery_list_source_type then
    if p_meal_plan_id is null
      or p_source_week_start_date is null
      or not exists (
        select 1
        from public.meal_plans
        where meal_plans.id = p_meal_plan_id
          and meal_plans.owner_id = authenticated_owner_id
          and meal_plans.week_start_date = p_source_week_start_date
      ) then
      raise insufficient_privilege using message = 'Meal plan is not available.';
    end if;
  elsif p_meal_plan_id is not null or p_source_week_start_date is not null then
    raise invalid_parameter_value using message = 'Only meal-plan lists can have a source week.';
  end if;

  perform public.validate_generated_grocery_items(
    p_source_type,
    p_meal_plan_id,
    p_items,
    false
  );

  created_source_recipe_count := 0;
  if p_source_type = 'recipes'::public.grocery_list_source_type then
    select count(distinct (source.value ->> 'recipe_id')::uuid)::int
    into created_source_recipe_count
    from jsonb_array_elements(p_items) as item(value)
    cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value);

    if created_source_recipe_count > 10 then
      raise invalid_parameter_value using
        message = 'Recipe-generated grocery lists support at most 10 recipes.';
    end if;
  end if;

  insert into public.grocery_lists (
    owner_id,
    meal_plan_id,
    title,
    source_type,
    source_week_start_date,
    source_recipe_count
  ) values (
    authenticated_owner_id,
    p_meal_plan_id,
    btrim(p_title),
    p_source_type,
    p_source_week_start_date,
    created_source_recipe_count
  )
  returning id into created_list_id;

  for item_record in
    select *
    from jsonb_to_recordset(p_items) as item(
      name text,
      sort_order int,
      sources jsonb
    )
  loop
    insert into public.grocery_list_items (
      grocery_list_id,
      name,
      is_manual,
      sort_order
    ) values (
      created_list_id,
      btrim(item_record.name),
      false,
      item_record.sort_order
    )
    returning id into created_item_id;

    insert into public.grocery_list_item_sources (
      grocery_list_item_id,
      recipe_id,
      recipe_ingredient_id,
      recipe_title,
      ingredient_name,
      ingredient_amount,
      ingredient_unit,
      ingredient_notes,
      saved_servings,
      target_servings,
      scale_factor,
      contributed_amount,
      canonical_unit,
      sort_order
    )
    select
      created_item_id,
      source.recipe_id,
      source.recipe_ingredient_id,
      source.recipe_title,
      source.ingredient_name,
      source.ingredient_amount,
      source.ingredient_unit,
      source.ingredient_notes,
      source.saved_servings,
      source.target_servings,
      source.scale_factor,
      source.contributed_amount,
      nullif(public.normalize_grocery_item_name(source.canonical_unit), ''),
      source.sort_order
    from jsonb_to_recordset(item_record.sources) as source(
      recipe_id uuid,
      recipe_ingredient_id uuid,
      recipe_title text,
      ingredient_name text,
      ingredient_amount numeric,
      ingredient_unit text,
      ingredient_notes text,
      saved_servings int,
      target_servings int,
      scale_factor numeric,
      contributed_amount numeric,
      canonical_unit text,
      sort_order int
    );
  end loop;

  return created_list_id;
end;
$$;

revoke all on function public.create_grocery_list_with_items(
  text,
  public.grocery_list_source_type,
  uuid,
  date,
  jsonb
) from public, anon;

grant execute on function public.create_grocery_list_with_items(
  text,
  public.grocery_list_source_type,
  uuid,
  date,
  jsonb
) to authenticated;

create function public.search_grocery_list_recipe_options(
  p_search text default null
)
returns table (
  id uuid,
  title text,
  saved_servings int,
  ingredient_names text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    recipe.id,
    recipe.title,
    recipe.servings,
    coalesce(
      array_agg(
        recipe_ingredient.name
        order by recipe_ingredient.sort_order, recipe_ingredient.id
      ) filter (where recipe_ingredient.id is not null),
      '{}'::text[]
    ) as ingredient_names
  from public.recipes as recipe
  left join public.recipe_ingredients as recipe_ingredient
    on recipe_ingredient.recipe_id = recipe.id
  where recipe.owner_id = (select auth.uid())
    and recipe.archived_at is null
    and (
      nullif(btrim(p_search), '') is null
      or position(lower(btrim(p_search)) in lower(recipe.title)) > 0
      or exists (
        select 1
        from public.recipe_ingredients as matching_ingredient
        where matching_ingredient.recipe_id = recipe.id
          and position(
            lower(btrim(p_search)) in lower(matching_ingredient.name)
          ) > 0
      )
    )
  group by recipe.id
  order by recipe.title, recipe.id
  limit 50;
$$;

revoke all on function public.search_grocery_list_recipe_options(text)
from public, anon;

grant execute on function public.search_grocery_list_recipe_options(text)
to authenticated;
