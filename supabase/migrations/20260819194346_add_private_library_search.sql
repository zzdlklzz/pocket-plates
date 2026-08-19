create extension if not exists pg_trgm with schema extensions;

create index recipes_title_trgm_idx
on public.recipes
using gin (title extensions.gin_trgm_ops);

create index recipe_ingredients_name_trgm_idx
on public.recipe_ingredients
using gin (name extensions.gin_trgm_ops);

create or replace function public.list_private_library_recipes(
  p_search text default null,
  p_meal_types public.meal_type[] default null,
  p_cost_ratings public.cost_rating[] default null,
  p_difficulty public.difficulty_level default null
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
      end as cost_ratings
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
  public.difficulty_level
) from public;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level
) from anon;

grant execute on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level
) to authenticated;
