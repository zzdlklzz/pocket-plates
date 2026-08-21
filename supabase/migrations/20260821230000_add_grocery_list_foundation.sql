create type public.grocery_list_source_type as enum (
  'manual',
  'recipes',
  'meal_plan'
);

create function public.normalize_grocery_item_name(p_value text)
returns text
language sql
immutable
strict
parallel safe
security invoker
set search_path = ''
as $$
  select lower(btrim(regexp_replace(p_value, '[[:space:]]+', ' ', 'g')));
$$;

revoke all on function public.normalize_grocery_item_name(text)
from public, anon;

grant execute on function public.normalize_grocery_item_name(text)
to authenticated;

alter table public.grocery_lists
add column source_type public.grocery_list_source_type not null default 'manual',
add column source_week_start_date date;

alter table public.grocery_list_items
add column notes text,
add column normalized_name text generated always as (
  public.normalize_grocery_item_name(name)
) stored,
add column quantity_overridden boolean not null default false,
add column is_manual boolean not null default true;

do $$
begin
  if exists (
    select 1
    from public.grocery_lists
    where char_length(btrim(title)) not between 1 and 80
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cannot add grocery-list title constraints: incompatible rows already exist.';
  end if;

  if exists (
    select 1
    from public.grocery_list_items
    where normalized_name = ''
      or char_length(btrim(name)) not between 1 and 120
      or amount <= 0
      or (
        source_recipe_id is not null
        and amount is not null
        and amount <> round(amount, 6)
      )
      or char_length(btrim(coalesce(unit, ''))) > 40
      or char_length(btrim(coalesce(notes, ''))) > 180
      or sort_order < 0
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cannot add grocery-list item constraints: incompatible rows already exist.';
  end if;

  if exists (
    select 1
    from public.grocery_list_items
    group by grocery_list_id, normalized_name
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Cannot enforce unique grocery-list item names: duplicate normalized names already exist.';
  end if;
end;
$$;

update public.grocery_lists as grocery_list
set
  source_type = case
    when grocery_list.meal_plan_id is not null then 'meal_plan'::public.grocery_list_source_type
    when exists (
      select 1
      from public.grocery_list_items as grocery_list_item
      where grocery_list_item.grocery_list_id = grocery_list.id
        and grocery_list_item.source_recipe_id is not null
    ) then 'recipes'::public.grocery_list_source_type
    else 'manual'::public.grocery_list_source_type
  end,
  source_week_start_date = meal_plan.week_start_date
from public.meal_plans as meal_plan
where meal_plan.id = grocery_list.meal_plan_id;

update public.grocery_lists as grocery_list
set source_type = 'recipes'::public.grocery_list_source_type
where grocery_list.meal_plan_id is null
  and exists (
    select 1
    from public.grocery_list_items as grocery_list_item
    where grocery_list_item.grocery_list_id = grocery_list.id
      and grocery_list_item.source_recipe_id is not null
  );

create table public.grocery_list_item_sources (
  id uuid primary key default gen_random_uuid(),
  grocery_list_item_id uuid not null references public.grocery_list_items (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  recipe_ingredient_id uuid references public.recipe_ingredients (id) on delete set null,
  recipe_title text not null,
  ingredient_name text not null,
  ingredient_amount numeric,
  ingredient_unit text,
  ingredient_notes text,
  saved_servings int not null check (saved_servings > 0),
  target_servings int not null check (target_servings > 0),
  scale_factor numeric not null check (
    scale_factor > 0
    and scale_factor = round(scale_factor, 6)
  ),
  contributed_amount numeric check (
    contributed_amount is null
    or (
      contributed_amount > 0
      and contributed_amount = round(contributed_amount, 6)
    )
  ),
  canonical_unit text,
  sort_order int not null check (sort_order >= 0),
  created_at timestamptz not null default now()
);

insert into public.grocery_list_item_sources (
  grocery_list_item_id,
  recipe_id,
  recipe_title,
  ingredient_name,
  ingredient_amount,
  ingredient_unit,
  saved_servings,
  target_servings,
  scale_factor,
  contributed_amount,
  canonical_unit,
  sort_order
)
select
  grocery_list_item.id,
  recipe.id,
  recipe.title,
  grocery_list_item.name,
  grocery_list_item.amount,
  grocery_list_item.unit,
  recipe.servings,
  recipe.servings,
  1,
  grocery_list_item.amount,
  case
    when grocery_list_item.amount is null then null
    when nullif(public.normalize_grocery_item_name(grocery_list_item.unit), '') is null then null
    when public.normalize_grocery_item_name(grocery_list_item.unit) in ('cup', 'cups') then 'cup'
    when public.normalize_grocery_item_name(grocery_list_item.unit) = 'l' then 'l'
    else public.normalize_grocery_item_name(grocery_list_item.unit)
  end,
  grocery_list_item.sort_order
from public.grocery_list_items as grocery_list_item
join public.recipes as recipe
  on recipe.id = grocery_list_item.source_recipe_id
where grocery_list_item.source_recipe_id is not null;

update public.grocery_list_items
set
  is_manual = false,
  amount = null,
  unit = null,
  quantity_overridden = false
where source_recipe_id is not null;

alter table public.grocery_lists
add constraint grocery_lists_title_check
check (char_length(btrim(title)) between 1 and 80),
add constraint grocery_lists_source_check
check (
  (
    source_type = 'meal_plan'::public.grocery_list_source_type
    and source_week_start_date is not null
  )
  or (
    source_type <> 'meal_plan'::public.grocery_list_source_type
    and meal_plan_id is null
    and source_week_start_date is null
  )
);

alter table public.grocery_list_items
alter column normalized_name set not null,
add constraint grocery_list_items_name_check
check (
  normalized_name <> ''
  and char_length(btrim(name)) between 1 and 120
),
add constraint grocery_list_items_amount_check
check (amount is null or amount > 0),
add constraint grocery_list_items_unit_check
check (char_length(btrim(coalesce(unit, ''))) <= 40),
add constraint grocery_list_items_notes_check
check (char_length(btrim(coalesce(notes, ''))) <= 180),
add constraint grocery_list_items_sort_order_check
check (sort_order >= 0),
add constraint grocery_list_items_list_normalized_name_key
unique (grocery_list_id, normalized_name);

drop index public.grocery_list_items_list_sort_idx;

create index grocery_list_items_list_sort_idx
on public.grocery_list_items (grocery_list_id, sort_order, id);

create index grocery_list_item_sources_item_sort_idx
on public.grocery_list_item_sources (grocery_list_item_id, sort_order, id);

create index grocery_list_item_sources_recipe_idx
on public.grocery_list_item_sources (recipe_id);

drop policy if exists "grocery list items follow grocery list ownership"
on public.grocery_list_items;

alter table public.grocery_list_items
drop column source_recipe_id;

alter table public.grocery_list_item_sources enable row level security;

create policy "grocery list items follow grocery list ownership"
on public.grocery_list_items for all
to authenticated
using (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
    and grocery_lists.owner_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
    and grocery_lists.owner_id = (select auth.uid())
));

create policy "grocery list item sources follow grocery list ownership"
on public.grocery_list_item_sources for all
to authenticated
using (exists (
  select 1
  from public.grocery_list_items
  join public.grocery_lists
    on grocery_lists.id = grocery_list_items.grocery_list_id
  where grocery_list_items.id = grocery_list_item_sources.grocery_list_item_id
    and grocery_lists.owner_id = (select auth.uid())
))
with check (
  exists (
    select 1
    from public.grocery_list_items
    join public.grocery_lists
      on grocery_lists.id = grocery_list_items.grocery_list_id
    where grocery_list_items.id = grocery_list_item_sources.grocery_list_item_id
      and grocery_lists.owner_id = (select auth.uid())
  )
  and (
    grocery_list_item_sources.recipe_id is null
    or exists (
      select 1
      from public.recipes
      where recipes.id = grocery_list_item_sources.recipe_id
        and recipes.owner_id = (select auth.uid())
    )
  )
  and (
    grocery_list_item_sources.recipe_ingredient_id is null
    or exists (
      select 1
      from public.recipe_ingredients
      join public.recipes
        on recipes.id = recipe_ingredients.recipe_id
      where recipe_ingredients.id = grocery_list_item_sources.recipe_ingredient_id
        and recipes.id = grocery_list_item_sources.recipe_id
        and recipes.owner_id = (select auth.uid())
    )
  )
);

grant select, insert, update, delete on table public.grocery_lists to authenticated;
grant select, insert, update, delete on table public.grocery_list_items to authenticated;
grant select, insert, delete on table public.grocery_list_item_sources to authenticated;

create function public.touch_grocery_list_from_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- A foreign-key cascade already has the parent list in its delete path.
  if pg_trigger_depth() = 1 then
    update public.grocery_lists
    set updated_at = now()
    where id = case when tg_op = 'DELETE' then old.grocery_list_id else new.grocery_list_id end;
  end if;

  return null;
end;
$$;

create trigger touch_grocery_list_after_item_change
after insert or update or delete on public.grocery_list_items
for each row execute function public.touch_grocery_list_from_item();

revoke execute on function public.touch_grocery_list_from_item()
from public, anon, authenticated;

create function public.list_grocery_lists()
returns table (
  id uuid,
  title text,
  source_type public.grocery_list_source_type,
  source_week_start_date date,
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

create function public.validate_generated_grocery_items(
  p_source_type public.grocery_list_source_type,
  p_meal_plan_id uuid,
  p_items jsonb,
  p_allow_empty boolean default false
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  authenticated_owner_id uuid := auth.uid();
  item_record record;
  source_record record;
  source_recipe record;
  source_ingredient record;
  expected_canonical_unit text;
begin
  if authenticated_owner_id is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if p_source_type = 'manual'::public.grocery_list_source_type then
    raise invalid_parameter_value using message = 'Generated items require a recipe or meal-plan source.';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) > 300
    or (not p_allow_empty and jsonb_array_length(p_items) = 0) then
    raise invalid_parameter_value using message = 'Generated grocery item count is invalid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) with ordinality as item(value, position)
    where jsonb_typeof(item.value) <> 'object'
      or jsonb_typeof(item.value -> 'name') <> 'string'
      or jsonb_typeof(item.value -> 'sort_order') <> 'number'
      or jsonb_typeof(item.value -> 'sources') <> 'array'
      or jsonb_array_length(item.value -> 'sources') = 0
  ) then
    raise invalid_parameter_value using message = 'Generated grocery item data is invalid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
    where jsonb_typeof(source.value) <> 'object'
  ) then
    raise invalid_parameter_value using message = 'Generated grocery source data is invalid.';
  end if;

  if exists (
    select 1
    from (
      select
        item.position,
        (item.value ->> 'sort_order')::int as sort_order,
        lag((item.value ->> 'sort_order')::int) over (order by item.position) as previous_sort_order
      from jsonb_array_elements(p_items) with ordinality as item(value, position)
    ) as ordered_item
    where ordered_item.sort_order < 0
      or ordered_item.previous_sort_order >= ordered_item.sort_order
  ) then
    raise invalid_parameter_value using message = 'Generated grocery item order must be unique and increasing.';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_items) as item(value)
  ) <> (
    select count(distinct public.normalize_grocery_item_name(item.value ->> 'name'))
    from jsonb_array_elements(p_items) as item(value)
  ) then
    raise invalid_parameter_value using message = 'Generated grocery item names must be unique.';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_items) as item(value)
    cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
  ) <> (
    select count(distinct (source.value ->> 'recipe_ingredient_id')::uuid)
    from jsonb_array_elements(p_items) as item(value)
    cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
  ) then
    raise invalid_parameter_value using message = 'Generated grocery ingredients must be unique.';
  end if;

  if exists (
    select 1
    from (
      select distinct (source.value ->> 'recipe_id')::uuid as recipe_id
      from jsonb_array_elements(p_items) as item(value)
      cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
    ) as payload_recipe
    join public.recipes as recipe
      on recipe.id = payload_recipe.recipe_id
      and recipe.owner_id = authenticated_owner_id
    join public.recipe_ingredients as recipe_ingredient
      on recipe_ingredient.recipe_id = recipe.id
    where not exists (
      select 1
      from jsonb_array_elements(p_items) as item(value)
      cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
      where (source.value ->> 'recipe_id')::uuid = payload_recipe.recipe_id
        and (source.value ->> 'recipe_ingredient_id')::uuid = recipe_ingredient.id
    )
  ) then
    raise invalid_parameter_value using message = 'Generated grocery items must include every recipe ingredient.';
  end if;

  if p_source_type = 'meal_plan'::public.grocery_list_source_type
    and exists (
      select meal_plan_recipe.recipe_id
      from (
        select distinct meal_plan_entries.recipe_id
        from public.meal_plan_entries
        where meal_plan_entries.meal_plan_id = p_meal_plan_id
      ) as meal_plan_recipe
      where not exists (
        select 1
        from jsonb_array_elements(p_items) as item(value)
        cross join lateral jsonb_array_elements(item.value -> 'sources') as source(value)
        where (source.value ->> 'recipe_id')::uuid = meal_plan_recipe.recipe_id
      )
    ) then
    raise invalid_parameter_value using message = 'Generated grocery items must include every planned recipe.';
  end if;

  for item_record in
    select *
    from jsonb_to_recordset(p_items) as item(
      name text,
      sort_order int,
      sources jsonb
    )
  loop
    if public.normalize_grocery_item_name(item_record.name) = ''
      or char_length(btrim(item_record.name)) > 120 then
      raise invalid_parameter_value using message = 'Generated grocery item names are invalid.';
    end if;

    for source_record in
      select *
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
      )
    loop
      if source_record.recipe_id is null
        or source_record.recipe_ingredient_id is null
        or source_record.recipe_title is null
        or source_record.ingredient_name is null
        or source_record.saved_servings is null
        or source_record.target_servings is null
        or source_record.scale_factor is null
        or source_record.sort_order is null
        or source_record.saved_servings not between 1 and 100
        or source_record.target_servings < 1
        or (
          p_source_type = 'recipes'::public.grocery_list_source_type
          and source_record.target_servings > 100
        )
        or source_record.scale_factor <= 0
        or source_record.ingredient_amount <= 0
        or source_record.contributed_amount <= 0
        or source_record.sort_order < 0
        or char_length(btrim(source_record.recipe_title)) not between 1 and 120
        or char_length(btrim(source_record.ingredient_name)) not between 1 and 120
        or char_length(btrim(coalesce(source_record.ingredient_unit, ''))) > 40
        or char_length(btrim(coalesce(source_record.ingredient_notes, ''))) > 180
        or char_length(btrim(coalesce(source_record.canonical_unit, ''))) > 40
        or public.normalize_grocery_item_name(source_record.ingredient_name)
          <> public.normalize_grocery_item_name(item_record.name) then
        raise invalid_parameter_value using message = 'Generated grocery source data is invalid.';
      end if;

      if source_record.scale_factor <> round(source_record.scale_factor, 6)
        or (
          source_record.contributed_amount is not null
          and source_record.contributed_amount <> round(source_record.contributed_amount, 6)
        )
        or round(source_record.scale_factor, 6)
          <> round(source_record.target_servings::numeric / source_record.saved_servings, 6)
        or (
          source_record.ingredient_amount is null
          and source_record.contributed_amount is not null
        )
        or (
          source_record.ingredient_amount is not null
          and (
            source_record.contributed_amount is null
            or round(source_record.contributed_amount, 6) <>
              round(
                source_record.ingredient_amount
                  * source_record.target_servings::numeric
                  / source_record.saved_servings,
                6
              )
          )
        ) then
        raise invalid_parameter_value using message = 'Generated grocery source amounts are invalid.';
      end if;

      select recipe.id, recipe.title, recipe.servings, recipe.archived_at
      into source_recipe
      from public.recipes as recipe
      where recipe.id = source_record.recipe_id
        and recipe.owner_id = authenticated_owner_id;

      if source_recipe.id is null
        or source_recipe.title <> source_record.recipe_title
        or source_recipe.servings <> source_record.saved_servings
        or (
          p_source_type = 'recipes'::public.grocery_list_source_type
          and source_recipe.archived_at is not null
        ) then
        raise insufficient_privilege using message = 'A source recipe is not available.';
      end if;

      if p_source_type = 'meal_plan'::public.grocery_list_source_type
        and not exists (
          select 1
          from public.meal_plan_entries
          where meal_plan_entries.meal_plan_id = p_meal_plan_id
            and meal_plan_entries.recipe_id = source_record.recipe_id
        ) then
        raise insufficient_privilege using message = 'A source recipe is not available in the meal plan.';
      end if;

      if p_source_type = 'meal_plan'::public.grocery_list_source_type
        and source_record.target_servings <> (
          select sum(meal_plan_entries.servings)::int
          from public.meal_plan_entries
          where meal_plan_entries.meal_plan_id = p_meal_plan_id
            and meal_plan_entries.recipe_id = source_record.recipe_id
        ) then
        raise invalid_parameter_value using message = 'Generated grocery servings do not match the meal plan.';
      end if;

      select
        recipe_ingredient.name,
        recipe_ingredient.amount,
        recipe_ingredient.unit,
        recipe_ingredient.notes
      into source_ingredient
      from public.recipe_ingredients as recipe_ingredient
      where recipe_ingredient.id = source_record.recipe_ingredient_id
        and recipe_ingredient.recipe_id = source_record.recipe_id;

      if source_ingredient.name is null
        or source_ingredient.name <> source_record.ingredient_name
        or source_ingredient.amount is distinct from source_record.ingredient_amount
        or source_ingredient.unit is distinct from source_record.ingredient_unit
        or source_ingredient.notes is distinct from source_record.ingredient_notes then
        raise insufficient_privilege using message = 'A source ingredient is not available.';
      end if;

      expected_canonical_unit := case
        when source_ingredient.amount is null then null
        when nullif(
          public.normalize_grocery_item_name(source_ingredient.unit),
          ''
        ) is null then null
        when public.normalize_grocery_item_name(source_ingredient.unit) in ('cup', 'cups') then 'cup'
        when public.normalize_grocery_item_name(source_ingredient.unit) = 'l' then 'l'
        else public.normalize_grocery_item_name(source_ingredient.unit)
      end;

      if nullif(
        public.normalize_grocery_item_name(source_record.canonical_unit),
        ''
      ) is distinct from expected_canonical_unit then
        raise invalid_parameter_value using message = 'Generated grocery source unit is invalid.';
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.validate_generated_grocery_items(
  public.grocery_list_source_type,
  uuid,
  jsonb,
  boolean
) from public, anon;

grant execute on function public.validate_generated_grocery_items(
  public.grocery_list_source_type,
  uuid,
  jsonb,
  boolean
) to authenticated;

create function public.create_grocery_list_with_items(
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

  insert into public.grocery_lists (
    owner_id,
    meal_plan_id,
    title,
    source_type,
    source_week_start_date
  ) values (
    authenticated_owner_id,
    p_meal_plan_id,
    btrim(p_title),
    p_source_type,
    p_source_week_start_date
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

create function public.refresh_grocery_list_from_meal_plan(
  p_grocery_list_id uuid,
  p_generated_items jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  authenticated_owner_id uuid := auth.uid();
  linked_meal_plan_id uuid;
  refreshed_item_ids uuid[] := '{}'::uuid[];
  refreshed_item_id uuid;
  item_record record;
begin
  if authenticated_owner_id is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  select grocery_list.meal_plan_id
  into linked_meal_plan_id
  from public.grocery_lists as grocery_list
  join public.meal_plans as meal_plan
    on meal_plan.id = grocery_list.meal_plan_id
  where grocery_list.id = p_grocery_list_id
    and grocery_list.owner_id = authenticated_owner_id
    and grocery_list.source_type = 'meal_plan'::public.grocery_list_source_type
    and meal_plan.owner_id = authenticated_owner_id
  for update of grocery_list;

  if linked_meal_plan_id is null then
    raise insufficient_privilege using message = 'Meal-plan grocery list is not available.';
  end if;

  perform public.validate_generated_grocery_items(
    'meal_plan'::public.grocery_list_source_type,
    linked_meal_plan_id,
    p_generated_items,
    true
  );

  delete from public.grocery_list_item_sources as grocery_list_item_source
  using public.grocery_list_items as grocery_list_item
  where grocery_list_item_source.grocery_list_item_id = grocery_list_item.id
    and grocery_list_item.grocery_list_id = p_grocery_list_id;

  for item_record in
    select *
    from jsonb_to_recordset(p_generated_items) as item(
      name text,
      sort_order int,
      sources jsonb
    )
  loop
    select grocery_list_item.id
    into refreshed_item_id
    from public.grocery_list_items as grocery_list_item
    where grocery_list_item.grocery_list_id = p_grocery_list_id
      and grocery_list_item.normalized_name =
        public.normalize_grocery_item_name(item_record.name);

    if refreshed_item_id is null then
      insert into public.grocery_list_items (
        grocery_list_id,
        name,
        is_manual,
        sort_order
      ) values (
        p_grocery_list_id,
        btrim(item_record.name),
        false,
        item_record.sort_order
      )
      returning id into refreshed_item_id;
    else
      update public.grocery_list_items
      set
        quantity_overridden = quantity_overridden
          or (
            is_manual
            and (amount is not null or nullif(btrim(unit), '') is not null)
          ),
        sort_order = item_record.sort_order
      where id = refreshed_item_id;
    end if;

    refreshed_item_ids := array_append(refreshed_item_ids, refreshed_item_id);

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
      refreshed_item_id,
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

  delete from public.grocery_list_items
  where grocery_list_id = p_grocery_list_id
    and not is_manual
    and not (id = any(refreshed_item_ids));

  update public.grocery_lists
  set updated_at = now()
  where id = p_grocery_list_id;
end;
$$;

revoke all on function public.refresh_grocery_list_from_meal_plan(
  uuid,
  jsonb
) from public, anon;

grant execute on function public.refresh_grocery_list_from_meal_plan(
  uuid,
  jsonb
) to authenticated;
