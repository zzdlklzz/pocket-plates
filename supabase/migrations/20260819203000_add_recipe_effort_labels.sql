create type public.recipe_effort_label as enum (
  'quick',
  'make_ahead',
  'one_pot',
  'low_cleanup'
);

create table public.recipe_effort_labels (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  effort_label public.recipe_effort_label not null,
  created_at timestamptz not null default now(),
  primary key (recipe_id, effort_label)
);

create index recipe_effort_labels_effort_label_idx
on public.recipe_effort_labels (effort_label, recipe_id);

alter table public.recipe_effort_labels enable row level security;

create policy "recipe effort labels follow recipe ownership"
on public.recipe_effort_labels
for all
to authenticated
using (exists (
  select 1
  from public.recipes
  where recipes.id = recipe_effort_labels.recipe_id
    and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.recipes
  where recipes.id = recipe_effort_labels.recipe_id
    and recipes.owner_id = (select auth.uid())
));

grant select, insert, delete on table public.recipe_effort_labels to authenticated;

create or replace function public.replace_recipe_discovery_metadata(
  p_recipe_id uuid,
  p_effort_labels public.recipe_effort_label[] default '{}'::public.recipe_effort_label[]
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  authenticated_owner_id uuid := auth.uid();
  normalized_effort_labels public.recipe_effort_label[] := coalesce(
    p_effort_labels,
    '{}'::public.recipe_effort_label[]
  );
begin
  if authenticated_owner_id is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.recipes
    where recipes.id = p_recipe_id
      and recipes.owner_id = authenticated_owner_id
  ) then
    raise insufficient_privilege using message = 'Recipe is not available.';
  end if;

  if array_position(normalized_effort_labels, null) is not null then
    raise invalid_parameter_value using message = 'Effort labels cannot contain null values.';
  end if;

  if cardinality(normalized_effort_labels) <> (
    select count(distinct selected_effort_label.value)
    from unnest(normalized_effort_labels) as selected_effort_label(value)
  ) then
    raise invalid_parameter_value using message = 'Effort labels must be unique.';
  end if;

  delete from public.recipe_effort_labels
  where recipe_effort_labels.recipe_id = p_recipe_id;

  insert into public.recipe_effort_labels (recipe_id, effort_label)
  select p_recipe_id, selected_effort_label.value
  from unnest(normalized_effort_labels) as selected_effort_label(value);
end;
$$;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
) from public;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
) from anon;

grant execute on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
) to authenticated;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level
) from public;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level
) from anon;

drop function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level
);

create function public.list_private_library_recipes(
  p_search text default null,
  p_meal_types public.meal_type[] default null,
  p_cost_ratings public.cost_rating[] default null,
  p_difficulty public.difficulty_level default null,
  p_effort_labels public.recipe_effort_label[] default null
)
returns table (
  id uuid,
  title text,
  cost_rating public.cost_rating,
  difficulty public.difficulty_level,
  image_storage_path text,
  image_url text,
  created_at timestamptz,
  meal_types public.meal_type[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with normalized_filters as (
    select
      nullif(
        replace(
          replace(
            replace(btrim(p_search), E'\\', E'\\\\'),
            '%',
            E'\\%'
          ),
          '_',
          E'\\_'
        ),
        ''
      ) as search_pattern,
      case
        when p_meal_types is null or cardinality(p_meal_types) = 0 then null
        else p_meal_types
      end as meal_types,
      case
        when p_cost_ratings is null or cardinality(p_cost_ratings) = 0 then null
        else p_cost_ratings
      end as cost_ratings,
      case
        when p_effort_labels is null or cardinality(p_effort_labels) = 0 then null
        else p_effort_labels
      end as effort_labels
  )
  select
    recipe.id,
    recipe.title,
    recipe.cost_rating,
    recipe.difficulty,
    recipe.image_storage_path,
    recipe.image_url,
    recipe.created_at,
    coalesce(
      array_agg(recipe_meal_type.meal_type order by recipe_meal_type.meal_type)
        filter (where recipe_meal_type.meal_type is not null),
      '{}'::public.meal_type[]
    ) as meal_types
  from public.recipes as recipe
  cross join normalized_filters as filters
  left join public.recipe_meal_types as recipe_meal_type
    on recipe_meal_type.recipe_id = recipe.id
  where recipe.owner_id = (select auth.uid())
    and recipe.archived_at is null
    and (
      filters.search_pattern is null
      or recipe.title ilike ('%' || filters.search_pattern || '%') escape E'\\'
      or exists (
        select 1
        from public.recipe_ingredients as recipe_ingredient
        where recipe_ingredient.recipe_id = recipe.id
          and recipe_ingredient.name ilike ('%' || filters.search_pattern || '%') escape E'\\'
      )
    )
    and (
      filters.meal_types is null
      or exists (
        select 1
        from public.recipe_meal_types as selected_recipe_meal_type
        where selected_recipe_meal_type.recipe_id = recipe.id
          and (
            selected_recipe_meal_type.meal_type = any(filters.meal_types)
            or (
              selected_recipe_meal_type.meal_type = 'flexible'::public.meal_type
              and exists (
                select 1
                from unnest(filters.meal_types) as selected_meal_type(value)
                where selected_meal_type.value <> 'flexible'::public.meal_type
              )
            )
          )
      )
    )
    and (
      filters.cost_ratings is null
      or recipe.cost_rating = any(filters.cost_ratings)
    )
    and (
      p_difficulty is null
      or recipe.difficulty = p_difficulty
    )
    and (
      filters.effort_labels is null
      or not exists (
        select 1
        from unnest(filters.effort_labels) as selected_effort_label(value)
        where not exists (
          select 1
          from public.recipe_effort_labels as recipe_effort_label
          where recipe_effort_label.recipe_id = recipe.id
            and recipe_effort_label.effort_label = selected_effort_label.value
        )
      )
    )
  group by
    recipe.id,
    recipe.title,
    recipe.cost_rating,
    recipe.difficulty,
    recipe.image_storage_path,
    recipe.image_url,
    recipe.created_at
  order by recipe.created_at desc, recipe.id desc;
$$;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[]
) from public;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[]
) from anon;

grant execute on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[]
) to authenticated;
