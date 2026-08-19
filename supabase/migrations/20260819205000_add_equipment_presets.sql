alter table public.equipment
add column preset_key text;

alter table public.equipment
add constraint equipment_preset_key_check
check (
  preset_key is null
  or preset_key = any (array[
    'microwave',
    'rice_cooker',
    'stovetop',
    'oven',
    'blender',
    'no_oven'
  ]::text[])
);

-- Exact canonical labels are an unambiguous match for the controlled presets.
-- Other existing rows remain custom null-key catalog entries.
update public.equipment
set preset_key = case label
  when 'Microwave' then 'microwave'
  when 'Rice cooker' then 'rice_cooker'
  when 'Stovetop' then 'stovetop'
  when 'Oven' then 'oven'
  when 'Blender' then 'blender'
  when 'No oven needed' then 'no_oven'
end
where label in (
  'Microwave',
  'Rice cooker',
  'Stovetop',
  'Oven',
  'Blender',
  'No oven needed'
);

alter table public.equipment
add constraint equipment_owner_preset_key_key
unique (owner_id, preset_key);

grant select, insert, update on table public.equipment to authenticated;
grant select, insert, delete on table public.recipe_equipment to authenticated;

-- The owner-scoped policies already protect these tables, but fresh projects also
-- need explicit table privileges for the browser repository's existing CRUD flow.
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, delete on table public.recipe_meal_types to authenticated;
grant select, insert, delete on table public.recipe_links to authenticated;
grant select, insert, delete on table public.recipe_ingredients to authenticated;
grant select, insert, delete on table public.recipe_steps to authenticated;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
) from public;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
) from anon;

drop function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[]
);

create function public.replace_recipe_discovery_metadata(
  p_recipe_id uuid,
  p_effort_labels public.recipe_effort_label[] default '{}'::public.recipe_effort_label[],
  p_equipment_keys text[] default '{}'::text[]
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
  normalized_equipment_keys text[] := coalesce(p_equipment_keys, '{}'::text[]);
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

  if array_position(normalized_equipment_keys, null) is not null then
    raise invalid_parameter_value using message = 'Equipment keys cannot contain null values.';
  end if;

  if cardinality(normalized_equipment_keys) <> (
    select count(distinct selected_equipment_key.value)
    from unnest(normalized_equipment_keys) as selected_equipment_key(value)
  ) then
    raise invalid_parameter_value using message = 'Equipment keys must be unique.';
  end if;

  if exists (
    select 1
    from unnest(normalized_equipment_keys) as selected_equipment_key(value)
    where selected_equipment_key.value <> all (array[
      'microwave',
      'rice_cooker',
      'stovetop',
      'oven',
      'blender',
      'no_oven'
    ]::text[])
  ) then
    raise invalid_parameter_value using message = 'Equipment keys must use controlled values.';
  end if;

  if 'oven' = any(normalized_equipment_keys)
    and 'no_oven' = any(normalized_equipment_keys) then
    raise invalid_parameter_value using message = 'Oven and no-oven equipment choices conflict.';
  end if;

  delete from public.recipe_effort_labels
  where recipe_effort_labels.recipe_id = p_recipe_id;

  insert into public.recipe_effort_labels (recipe_id, effort_label)
  select p_recipe_id, selected_effort_label.value
  from unnest(normalized_effort_labels) as selected_effort_label(value);

  insert into public.equipment (owner_id, preset_key, label)
  select authenticated_owner_id, controlled_equipment.preset_key, controlled_equipment.label
  from (
    values
      ('microwave', 'Microwave'),
      ('rice_cooker', 'Rice cooker'),
      ('stovetop', 'Stovetop'),
      ('oven', 'Oven'),
      ('blender', 'Blender'),
      ('no_oven', 'No oven needed')
  ) as controlled_equipment(preset_key, label)
  where controlled_equipment.preset_key = any(normalized_equipment_keys)
  on conflict (owner_id, preset_key)
  do update set label = excluded.label;

  delete from public.recipe_equipment
  using public.equipment
  where recipe_equipment.recipe_id = p_recipe_id
    and equipment.id = recipe_equipment.equipment_id
    and equipment.preset_key is not null;

  insert into public.recipe_equipment (recipe_id, equipment_id)
  select p_recipe_id, equipment.id
  from public.equipment
  where equipment.owner_id = authenticated_owner_id
    and equipment.preset_key = any(normalized_equipment_keys);
end;
$$;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[],
  text[]
) from public;

revoke all on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[],
  text[]
) from anon;

grant execute on function public.replace_recipe_discovery_metadata(
  uuid,
  public.recipe_effort_label[],
  text[]
) to authenticated;

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

drop function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[]
);

create function public.list_private_library_recipes(
  p_search text default null,
  p_meal_types public.meal_type[] default null,
  p_cost_ratings public.cost_rating[] default null,
  p_difficulty public.difficulty_level default null,
  p_effort_labels public.recipe_effort_label[] default null,
  p_equipment_keys text[] default null
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
      end as effort_labels,
      case
        when p_equipment_keys is null or cardinality(p_equipment_keys) = 0 then null
        else p_equipment_keys
      end as equipment_keys
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
    and (
      filters.equipment_keys is null
      or not exists (
        select 1
        from unnest(filters.equipment_keys) as selected_equipment_key(value)
        where not exists (
          select 1
          from public.recipe_equipment
          join public.equipment
            on equipment.id = recipe_equipment.equipment_id
          where recipe_equipment.recipe_id = recipe.id
            and equipment.owner_id = (select auth.uid())
            and equipment.preset_key = selected_equipment_key.value
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
  public.recipe_effort_label[],
  text[]
) from public;

revoke all on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[],
  text[]
) from anon;

grant execute on function public.list_private_library_recipes(
  text,
  public.meal_type[],
  public.cost_rating[],
  public.difficulty_level,
  public.recipe_effort_label[],
  text[]
) to authenticated;
