begin;

do $$
declare
  table_name text;
  privilege_name text;
begin
  foreach table_name in array array['grocery_lists', 'grocery_list_items']
  loop
    foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    loop
      if not has_table_privilege('authenticated', 'public.' || table_name, privilege_name) then
        raise exception 'authenticated must have % on public.%', privilege_name, table_name;
      end if;

      if has_table_privilege('anon', 'public.' || table_name, privilege_name) then
        raise exception 'anon must not have % on public.%', privilege_name, table_name;
      end if;
    end loop;
  end loop;

  foreach privilege_name in array array['SELECT', 'INSERT', 'DELETE']
  loop
    if not has_table_privilege('authenticated', 'public.grocery_list_item_sources', privilege_name) then
      raise exception 'authenticated must have % on public.grocery_list_item_sources', privilege_name;
    end if;

    if has_table_privilege('anon', 'public.grocery_list_item_sources', privilege_name) then
      raise exception 'anon must not have % on public.grocery_list_item_sources', privilege_name;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.grocery_list_item_sources', 'UPDATE') then
    raise exception 'authenticated must not update grocery source snapshots directly';
  end if;

  if not has_function_privilege('authenticated', 'public.list_grocery_lists()', 'EXECUTE')
    or not has_function_privilege(
      'authenticated',
      'public.create_grocery_list_with_items(text, public.grocery_list_source_type, uuid, date, jsonb)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.refresh_grocery_list_from_meal_plan(uuid, jsonb)',
      'EXECUTE'
    ) then
    raise exception 'authenticated must execute grocery-list functions';
  end if;

  if has_function_privilege('anon', 'public.list_grocery_lists()', 'EXECUTE')
    or has_function_privilege(
      'anon',
      'public.create_grocery_list_with_items(text, public.grocery_list_source_type, uuid, date, jsonb)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.refresh_grocery_list_from_meal_plan(uuid, jsonb)',
      'EXECUTE'
    ) then
    raise exception 'anon must not execute grocery-list functions';
  end if;

  if position(
    'for update of grocery_list' in lower(
      pg_get_functiondef(
        'public.refresh_grocery_list_from_meal_plan(uuid,jsonb)'::regprocedure
      )
    )
  ) = 0 then
    raise exception 'Meal-plan refresh must lock the grocery-list row before replacement.';
  end if;

  if (
    select is_nullable
    from information_schema.columns as information_schema_column
    where information_schema_column.table_schema = 'public'
      and information_schema_column.table_name = 'grocery_list_items'
      and information_schema_column.column_name = 'normalized_name'
  ) <> 'NO' then
    raise exception 'Normalized grocery item names must be non-null.';
  end if;
end;
$$;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('12000000-0000-0000-0000-000000000001', 'grocery-owner-one@example.test', '{}'::jsonb, '{}'::jsonb),
  ('12000000-0000-0000-0000-000000000002', 'grocery-owner-two@example.test', '{}'::jsonb, '{}'::jsonb);

insert into public.recipes (id, owner_id, title, servings, archived_at)
values
  (
    '22000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000001',
    'Owner one curry',
    4,
    null
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    '12000000-0000-0000-0000-000000000001',
    'Owner one tray bake',
    2,
    '2026-08-20T00:00:00Z'
  ),
  (
    '22000000-0000-0000-0000-000000000003',
    '12000000-0000-0000-0000-000000000002',
    'Owner two curry',
    4,
    null
  );

insert into public.recipe_ingredients (
  id,
  recipe_id,
  name,
  amount,
  unit,
  notes,
  sort_order
)
values
  (
    '32000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Rice',
    2,
    'cups',
    null,
    0
  ),
  (
    '32000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000001',
    'Pepper',
    1,
    'tbsp',
    'ground',
    1
  ),
  (
    '32000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000002',
    'Broccoli',
    1,
    null,
    null,
    0
  ),
  (
    '32000000-0000-0000-0000-000000000004',
    '22000000-0000-0000-0000-000000000002',
    'Garlic',
    null,
    null,
    null,
    1
  ),
  (
    '32000000-0000-0000-0000-000000000005',
    '22000000-0000-0000-0000-000000000003',
    'Rice',
    1,
    'cup',
    null,
    0
  );

insert into public.meal_plans (id, owner_id, week_start_date)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000001',
    '2026-08-17'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '12000000-0000-0000-0000-000000000002',
    '2026-08-17'
  ),
  (
    '42000000-0000-0000-0000-000000000003',
    '12000000-0000-0000-0000-000000000001',
    '2026-08-24'
  );

insert into public.meal_plan_entries (
  id,
  meal_plan_id,
  recipe_id,
  planned_for,
  meal_type,
  servings
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    '2026-08-17',
    'dinner',
    4
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    '42000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000002',
    '2026-08-18',
    'dinner',
    2
  ),
  (
    '52000000-0000-0000-0000-000000000003',
    '42000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000003',
    '2026-08-17',
    'dinner',
    4
  ),
  (
    '52000000-0000-0000-0000-000000000004',
    '42000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000002',
    '2026-08-24',
    'lunch',
    60
  ),
  (
    '52000000-0000-0000-0000-000000000005',
    '42000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000002',
    '2026-08-25',
    'dinner',
    60
  );

create function pg_temp.owner_one_recipe_payload(
  p_rice_canonical_unit text default 'cup',
  p_duplicate_rice boolean default false,
  p_rice_scale_factor numeric default 1,
  p_rice_contributed_amount numeric default 2
)
returns jsonb
language plpgsql
as $$
declare
  rice_source jsonb := jsonb_build_object(
    'recipe_id', '22000000-0000-0000-0000-000000000001',
    'recipe_ingredient_id', '32000000-0000-0000-0000-000000000001',
    'recipe_title', 'Owner one curry',
    'ingredient_name', 'Rice',
    'ingredient_amount', 2,
    'ingredient_unit', 'cups',
    'ingredient_notes', null,
    'saved_servings', 4,
    'target_servings', 4,
    'scale_factor', p_rice_scale_factor,
    'contributed_amount', p_rice_contributed_amount,
    'canonical_unit', p_rice_canonical_unit,
    'sort_order', 0
  );
begin
  return jsonb_build_array(
    jsonb_build_object(
      'name', 'Rice',
      'sort_order', 0,
      'sources', case
        when p_duplicate_rice then jsonb_build_array(rice_source, rice_source)
        else jsonb_build_array(rice_source)
      end
    ),
    jsonb_build_object(
      'name', 'Pepper',
      'sort_order', 1,
      'sources', jsonb_build_array(
        jsonb_build_object(
          'recipe_id', '22000000-0000-0000-0000-000000000001',
          'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
          'recipe_title', 'Owner one curry',
          'ingredient_name', 'Pepper',
          'ingredient_amount', 1,
          'ingredient_unit', 'tbsp',
          'ingredient_notes', 'ground',
          'saved_servings', 4,
          'target_servings', 4,
          'scale_factor', 1,
          'contributed_amount', 1,
          'canonical_unit', 'tbsp',
          'sort_order', 1
        )
      )
    )
  );
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

insert into public.grocery_lists (id, owner_id, title)
values (
  '62000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  'Manual groceries'
);

update public.grocery_lists
set updated_at = '2026-01-01T00:00:00Z'
where id = '62000000-0000-0000-0000-000000000001';

insert into public.grocery_list_items (
  id,
  grocery_list_id,
  name,
  amount,
  unit,
  sort_order
)
values (
  '72000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',
  E'\t Whole \n milk \t',
  1,
  'bottle',
  0
);

do $$
declare
  summary_row record;
begin
  if (
    select normalized_name
    from public.grocery_list_items
    where id = '72000000-0000-0000-0000-000000000001'
  ) <> 'whole milk' then
    raise exception 'Item names must normalize by whitespace and case.';
  end if;

  if (
    select updated_at
    from public.grocery_lists
    where id = '62000000-0000-0000-0000-000000000001'
  ) <= '2026-01-01T00:00:00Z' then
    raise exception 'Item mutations must touch the parent list.';
  end if;

  select * into summary_row
  from public.list_grocery_lists()
  where id = '62000000-0000-0000-0000-000000000001';

  if summary_row.source_type <> 'manual'::public.grocery_list_source_type
    or summary_row.item_count <> 1
    or summary_row.checked_item_count <> 0
    or summary_row.meal_plan_available then
    raise exception 'The grocery-list summary is incorrect.';
  end if;

  begin
    insert into public.grocery_list_items (grocery_list_id, name, sort_order)
    values (
      '62000000-0000-0000-0000-000000000001',
      E'\nWHOLE\tmilk\t',
      1
    );
    raise exception 'A normalized duplicate item should fail.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.grocery_list_items (grocery_list_id, name, sort_order)
    values (
      '62000000-0000-0000-0000-000000000001',
      E' \t\n ',
      1
    );
    raise exception 'A whitespace-only item name should fail.';
  exception
    when check_violation then null;
  end;

  if public.normalize_grocery_item_name(E'\t PEPPER \n') <> 'pepper' then
    raise exception 'The SQL name normalizer must trim every supported whitespace form.';
  end if;

  begin
    insert into public.grocery_lists (owner_id, title)
    values (
      '12000000-0000-0000-0000-000000000002',
      'Forbidden list'
    );
    raise exception 'A user must not create another owner''s list.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.grocery_lists (
      owner_id,
      meal_plan_id,
      title,
      source_type,
      source_week_start_date
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000002',
      'Forbidden plan attachment',
      'meal_plan'::public.grocery_list_source_type,
      '2026-08-17'
    );
    raise exception 'A list must not attach another owner''s meal plan.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.grocery_lists
    set
      meal_plan_id = '42000000-0000-0000-0000-000000000002',
      source_type = 'meal_plan'::public.grocery_list_source_type,
      source_week_start_date = '2026-08-17'
    where id = '62000000-0000-0000-0000-000000000001';
    raise exception 'A list must not update to another owner''s meal plan.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.grocery_list_item_sources (
      grocery_list_item_id,
      recipe_id,
      recipe_ingredient_id,
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
    ) values (
      '72000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000003',
      '32000000-0000-0000-0000-000000000005',
      'Owner two curry',
      'Rice',
      1,
      'cup',
      4,
      4,
      1,
      1,
      'cup',
      0
    );
    raise exception 'A source must not attach another owner''s recipe data.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
declare
  selected_list_id uuid;
begin
  selected_list_id := public.create_grocery_list_with_items(
    'Recipe groceries',
    'recipes'::public.grocery_list_source_type,
    null,
    null,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Rice',
        'sort_order', 0,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000001',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000001',
            'recipe_title', 'Owner one curry',
            'ingredient_name', 'Rice',
            'ingredient_amount', 2,
            'ingredient_unit', 'cups',
            'ingredient_notes', null,
            'saved_servings', 4,
            'target_servings', 4,
            'scale_factor', 1,
            'contributed_amount', 2,
            'canonical_unit', 'cup',
            'sort_order', 0
          )
        )
      ),
      jsonb_build_object(
        'name', 'Pepper',
        'sort_order', 1,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000001',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
            'recipe_title', 'Owner one curry',
            'ingredient_name', 'Pepper',
            'ingredient_amount', 1,
            'ingredient_unit', 'tbsp',
            'ingredient_notes', 'ground',
            'saved_servings', 4,
            'target_servings', 4,
            'scale_factor', 1,
            'contributed_amount', 1,
            'canonical_unit', 'tbsp',
            'sort_order', 1
          )
        )
      )
    )
  );

  if not exists (
    select 1
    from public.grocery_lists
    where id = selected_list_id
      and source_type = 'recipes'::public.grocery_list_source_type
  ) or not exists (
    select 1
    from public.grocery_list_item_sources as source
    join public.grocery_list_items as item on item.id = source.grocery_list_item_id
    where item.grocery_list_id = selected_list_id
      and source.recipe_title = 'Owner one curry'
  ) then
    raise exception 'Generated creation must save one atomic snapshot.';
  end if;

  begin
    perform public.refresh_grocery_list_from_meal_plan(
      selected_list_id,
      '[]'::jsonb
    );
    raise exception 'Recipe snapshots must not accept meal-plan refresh.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.create_grocery_list_with_items(
      'Cross-owner source',
      'recipes'::public.grocery_list_source_type,
      null,
      null,
      jsonb_build_array(
        jsonb_build_object(
          'name', 'Rice',
          'sort_order', 0,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000003',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000005',
              'recipe_title', 'Owner two curry',
              'ingredient_name', 'Rice',
              'ingredient_amount', 1,
              'ingredient_unit', 'cup',
              'ingredient_notes', null,
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 1,
              'canonical_unit', 'cup',
              'sort_order', 0
            )
          )
        )
      )
    );
    raise exception 'Generated creation must reject another owner''s source.';
  exception
    when insufficient_privilege then null;
  end;

  if exists (
    select 1
    from public.grocery_lists
    where title = 'Cross-owner source'
  ) then
    raise exception 'A failed generated create must not leave a partial list.';
  end if;

  begin
    perform public.create_grocery_list_with_items(
      'Invalid arithmetic',
      'recipes'::public.grocery_list_source_type,
      null,
      null,
      jsonb_build_array(
        jsonb_build_object(
          'name', 'Rice',
          'sort_order', 0,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000001',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000001',
              'recipe_title', 'Owner one curry',
              'ingredient_name', 'Rice',
              'ingredient_amount', 2,
              'ingredient_unit', 'cups',
              'ingredient_notes', null,
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 999,
              'canonical_unit', 'cup',
              'sort_order', 0
            )
          )
        ),
        jsonb_build_object(
          'name', 'Pepper',
          'sort_order', 1,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000001',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
              'recipe_title', 'Owner one curry',
              'ingredient_name', 'Pepper',
              'ingredient_amount', 1,
              'ingredient_unit', 'tbsp',
              'ingredient_notes', 'ground',
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 1,
              'canonical_unit', 'tbsp',
              'sort_order', 1
            )
          )
        )
      )
    );
    raise exception 'Generated creation must reject arbitrary contributed amounts.';
  exception
    when invalid_parameter_value then null;
  end;

  if exists (
    select 1
    from public.grocery_lists
    where title = 'Invalid arithmetic'
  ) then
    raise exception 'Invalid arithmetic must not leave a partial list.';
  end if;

  begin
    perform public.create_grocery_list_with_items(
      'Excess scale precision',
      'recipes'::public.grocery_list_source_type,
      null,
      null,
      pg_temp.owner_one_recipe_payload('cup', false, 1.0000004, 2)
    );
    raise exception 'Generated creation must reject scale factors beyond six decimals.';
  exception
    when invalid_parameter_value then null;
  end;

  if exists (
    select 1
    from public.grocery_lists
    where title = 'Excess scale precision'
  ) then
    raise exception 'Excess scale precision must not leave a partial list.';
  end if;

  begin
    perform public.create_grocery_list_with_items(
      'Excess contribution precision',
      'recipes'::public.grocery_list_source_type,
      null,
      null,
      pg_temp.owner_one_recipe_payload('cup', false, 1, 2.0000004)
    );
    raise exception 'Generated creation must reject contributions beyond six decimals.';
  exception
    when invalid_parameter_value then null;
  end;

  if exists (
    select 1
    from public.grocery_lists
    where title = 'Excess contribution precision'
  ) then
    raise exception 'Excess contribution precision must not leave a partial list.';
  end if;

  begin
    perform public.validate_generated_grocery_items(
      'recipes'::public.grocery_list_source_type,
      null,
      pg_temp.owner_one_recipe_payload('cup', true),
      false
    );
    raise exception 'Generated payloads must reject duplicate recipe ingredients.';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.validate_generated_grocery_items(
      'recipes'::public.grocery_list_source_type,
      null,
      pg_temp.owner_one_recipe_payload() - 1,
      false
    );
    raise exception 'Generated payloads must include every current ingredient.';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.validate_generated_grocery_items(
      'recipes'::public.grocery_list_source_type,
      null,
      pg_temp.owner_one_recipe_payload('kg', false),
      false
    );
    raise exception 'Generated payloads must reject an incorrect canonical unit.';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

do $$
declare
  large_week_list_id uuid;
begin
  large_week_list_id := public.create_grocery_list_with_items(
    'Large week groceries',
    'meal_plan'::public.grocery_list_source_type,
    '42000000-0000-0000-0000-000000000003',
    '2026-08-24',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Broccoli',
        'sort_order', 0,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000003',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Broccoli',
            'ingredient_amount', 1,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 120,
            'scale_factor', 60,
            'contributed_amount', 60,
            'canonical_unit', '',
            'sort_order', 0
          )
        )
      ),
      jsonb_build_object(
        'name', 'Garlic',
        'sort_order', 1,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000004',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Garlic',
            'ingredient_amount', null,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 120,
            'scale_factor', 60,
            'contributed_amount', null,
            'canonical_unit', null,
            'sort_order', 1
          )
        )
      )
    )
  );

  if not exists (
    select 1
    from public.grocery_lists
    where id = large_week_list_id
  ) or not exists (
    select 1
    from public.grocery_list_item_sources as source
    join public.grocery_list_items as item
      on item.id = source.grocery_list_item_id
    where item.grocery_list_id = large_week_list_id
      and source.ingredient_name = 'Broccoli'
      and source.canonical_unit is null
  ) then
    raise exception 'Large-week generation or unitless canonical persistence is incorrect.';
  end if;

  begin
    perform public.create_grocery_list_with_items(
      'Wrong week servings',
      'meal_plan'::public.grocery_list_source_type,
      '42000000-0000-0000-0000-000000000003',
      '2026-08-24',
      jsonb_build_array(
        jsonb_build_object(
          'name', 'Broccoli',
          'sort_order', 0,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000002',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000003',
              'recipe_title', 'Owner one tray bake',
              'ingredient_name', 'Broccoli',
              'ingredient_amount', 1,
              'ingredient_unit', null,
              'ingredient_notes', null,
              'saved_servings', 2,
              'target_servings', 119,
              'scale_factor', 59.5,
              'contributed_amount', 59.5,
              'canonical_unit', null,
              'sort_order', 0
            )
          )
        ),
        jsonb_build_object(
          'name', 'Garlic',
          'sort_order', 1,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000002',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000004',
              'recipe_title', 'Owner one tray bake',
              'ingredient_name', 'Garlic',
              'ingredient_amount', null,
              'ingredient_unit', null,
              'ingredient_notes', null,
              'saved_servings', 2,
              'target_servings', 119,
              'scale_factor', 59.5,
              'contributed_amount', null,
              'canonical_unit', null,
              'sort_order', 1
            )
          )
        )
      )
    );
    raise exception 'Meal-plan generation must match summed planned servings.';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.create_grocery_list_with_items(
      'Incomplete week recipes',
      'meal_plan'::public.grocery_list_source_type,
      '42000000-0000-0000-0000-000000000001',
      '2026-08-17',
      jsonb_build_array(
        jsonb_build_object(
          'name', 'Rice',
          'sort_order', 0,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000001',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000001',
              'recipe_title', 'Owner one curry',
              'ingredient_name', 'Rice',
              'ingredient_amount', 2,
              'ingredient_unit', 'cups',
              'ingredient_notes', null,
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 2,
              'canonical_unit', 'cup',
              'sort_order', 0
            )
          )
        ),
        jsonb_build_object(
          'name', 'Pepper',
          'sort_order', 1,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000001',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
              'recipe_title', 'Owner one curry',
              'ingredient_name', 'Pepper',
              'ingredient_amount', 1,
              'ingredient_unit', 'tbsp',
              'ingredient_notes', 'ground',
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 1,
              'canonical_unit', 'tbsp',
              'sort_order', 1
            )
          )
        )
      )
    );
    raise exception 'Meal-plan generation must include every planned recipe.';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

do $$
declare
  linked_list_id uuid;
  pepper_item_id uuid;
  before_failed_refresh jsonb;
  after_failed_refresh jsonb;
begin
  linked_list_id := public.create_grocery_list_with_items(
    'Week groceries',
    'meal_plan'::public.grocery_list_source_type,
    '42000000-0000-0000-0000-000000000001',
    '2026-08-17',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Rice',
        'sort_order', 0,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000001',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000001',
            'recipe_title', 'Owner one curry',
            'ingredient_name', 'Rice',
            'ingredient_amount', 2,
            'ingredient_unit', 'cups',
            'ingredient_notes', null,
            'saved_servings', 4,
            'target_servings', 4,
            'scale_factor', 1,
            'contributed_amount', 2,
            'canonical_unit', 'cup',
            'sort_order', 0
          )
        )
      ),
      jsonb_build_object(
        'name', 'Pepper',
        'sort_order', 1,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000001',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
            'recipe_title', 'Owner one curry',
            'ingredient_name', 'Pepper',
            'ingredient_amount', 1,
            'ingredient_unit', 'tbsp',
            'ingredient_notes', 'ground',
            'saved_servings', 4,
            'target_servings', 4,
            'scale_factor', 1,
            'contributed_amount', 1,
            'canonical_unit', 'tbsp',
            'sort_order', 1
          )
        )
      ),
      jsonb_build_object(
        'name', 'Broccoli',
        'sort_order', 2,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000003',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Broccoli',
            'ingredient_amount', 1,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 2,
            'scale_factor', 1,
            'contributed_amount', 1,
            'canonical_unit', null,
            'sort_order', 2
          )
        )
      ),
      jsonb_build_object(
        'name', 'Garlic',
        'sort_order', 3,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000004',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Garlic',
            'ingredient_amount', null,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 2,
            'scale_factor', 1,
            'contributed_amount', null,
            'canonical_unit', null,
            'sort_order', 3
          )
        )
      )
    )
  );

  select id into pepper_item_id
  from public.grocery_list_items
  where grocery_list_id = linked_list_id
    and normalized_name = 'pepper';

  update public.grocery_list_items
  set checked = true, amount = 1, unit = 'jar', quantity_overridden = true
  where id = pepper_item_id;

  delete from public.grocery_list_items
  where grocery_list_id = linked_list_id
    and normalized_name in ('broccoli', 'garlic');

  delete from public.recipe_ingredients
  where id = '32000000-0000-0000-0000-000000000001';

  insert into public.grocery_list_items (
    grocery_list_id,
    name,
    amount,
    unit,
    is_manual,
    sort_order
  ) values
    (linked_list_id, 'Salt', null, null, true, 10),
    (linked_list_id, 'Broccoli', 1, 'bag', true, 11);

  perform public.refresh_grocery_list_from_meal_plan(
    linked_list_id,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Pepper',
        'sort_order', 0,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000001',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000002',
            'recipe_title', 'Owner one curry',
            'ingredient_name', 'Pepper',
            'ingredient_amount', 1,
            'ingredient_unit', 'tbsp',
            'ingredient_notes', 'ground',
            'saved_servings', 4,
            'target_servings', 4,
            'scale_factor', 1,
            'contributed_amount', 1,
            'canonical_unit', 'tbsp',
            'sort_order', 0
          )
        )
      ),
      jsonb_build_object(
        'name', 'Broccoli',
        'sort_order', 1,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000003',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Broccoli',
            'ingredient_amount', 1,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 2,
            'scale_factor', 1,
            'contributed_amount', 1,
            'canonical_unit', null,
            'sort_order', 1
          )
        )
      ),
      jsonb_build_object(
        'name', 'Garlic',
        'sort_order', 2,
        'sources', jsonb_build_array(
          jsonb_build_object(
            'recipe_id', '22000000-0000-0000-0000-000000000002',
            'recipe_ingredient_id', '32000000-0000-0000-0000-000000000004',
            'recipe_title', 'Owner one tray bake',
            'ingredient_name', 'Garlic',
            'ingredient_amount', null,
            'ingredient_unit', null,
            'ingredient_notes', null,
            'saved_servings', 2,
            'target_servings', 2,
            'scale_factor', 1,
            'contributed_amount', null,
            'canonical_unit', null,
            'sort_order', 2
          )
        )
      )
    )
  );

  if exists (
    select 1 from public.grocery_list_items
    where grocery_list_id = linked_list_id and normalized_name = 'rice'
  ) then
    raise exception 'Refresh must remove obsolete generated products.';
  end if;

  if not exists (
    select 1 from public.grocery_list_items
    where id = pepper_item_id
      and checked
      and quantity_overridden
      and amount = 1
      and unit = 'jar'
  ) then
    raise exception 'Refresh must preserve matched checked state and overrides.';
  end if;

  if not exists (
    select 1 from public.grocery_list_items
    where grocery_list_id = linked_list_id
      and normalized_name = 'salt'
      and is_manual
  ) then
    raise exception 'Refresh must preserve unmatched manual products.';
  end if;

  if not exists (
    select 1
    from public.grocery_list_items as item
    join public.grocery_list_item_sources as source
      on source.grocery_list_item_id = item.id
    where item.grocery_list_id = linked_list_id
      and item.normalized_name = 'broccoli'
      and item.is_manual
      and item.quantity_overridden
      and item.amount = 1
      and item.unit = 'bag'
  ) then
    raise exception 'Refresh must attach sources to a same-name manual product.';
  end if;

  if not exists (
    select 1 from public.grocery_list_items
    where grocery_list_id = linked_list_id
      and normalized_name = 'garlic'
      and not checked
      and not is_manual
  ) then
    raise exception 'Refresh must add new generated products unchecked.';
  end if;

  select jsonb_agg(to_jsonb(item) order by item.id)
  into before_failed_refresh
  from public.grocery_list_items as item
  where item.grocery_list_id = linked_list_id;

  begin
    perform public.refresh_grocery_list_from_meal_plan(
      linked_list_id,
      jsonb_build_array(
        jsonb_build_object(
          'name', 'Rice',
          'sort_order', 0,
          'sources', jsonb_build_array(
            jsonb_build_object(
              'recipe_id', '22000000-0000-0000-0000-000000000003',
              'recipe_ingredient_id', '32000000-0000-0000-0000-000000000005',
              'recipe_title', 'Owner two curry',
              'ingredient_name', 'Rice',
              'ingredient_amount', 1,
              'ingredient_unit', 'cup',
              'ingredient_notes', null,
              'saved_servings', 4,
              'target_servings', 4,
              'scale_factor', 1,
              'contributed_amount', 1,
              'canonical_unit', 'cup',
              'sort_order', 0
            )
          )
        )
      )
    );
    raise exception 'Refresh must reject another owner''s source.';
  exception
    when insufficient_privilege or invalid_parameter_value then null;
  end;

  select jsonb_agg(to_jsonb(item) order by item.id)
  into after_failed_refresh
  from public.grocery_list_items as item
  where item.grocery_list_id = linked_list_id;

  if before_failed_refresh is distinct from after_failed_refresh then
    raise exception 'A failed refresh must leave the list unchanged.';
  end if;

  delete from public.meal_plan_entries
  where meal_plan_id = '42000000-0000-0000-0000-000000000001';

  perform public.refresh_grocery_list_from_meal_plan(
    linked_list_id,
    '[]'::jsonb
  );

  if (
    select count(*)
    from public.grocery_list_items
    where grocery_list_id = linked_list_id
      and not is_manual
  ) <> 0 or (
    select count(*)
    from public.grocery_list_items
    where grocery_list_id = linked_list_id
      and is_manual
  ) <> 2 or exists (
    select 1
    from public.grocery_list_item_sources as source
    join public.grocery_list_items as item
      on item.id = source.grocery_list_item_id
    where item.grocery_list_id = linked_list_id
  ) then
    raise exception 'An empty-week refresh must remove generated rows and preserve manual rows.';
  end if;

  delete from public.meal_plans
  where id = '42000000-0000-0000-0000-000000000001';

  if not exists (
    select 1 from public.grocery_lists
    where id = linked_list_id
      and meal_plan_id is null
      and source_week_start_date = '2026-08-17'
  ) then
    raise exception 'Deleting a meal plan must preserve its grocery snapshot and week label.';
  end if;

  if (
    select meal_plan_available
    from public.list_grocery_lists()
    where id = linked_list_id
  ) then
    raise exception 'An unavailable source week must not be refreshable.';
  end if;

  begin
    perform public.refresh_grocery_list_from_meal_plan(
      linked_list_id,
      jsonb_build_array(jsonb_build_object('name', 'Pepper', 'sort_order', 0, 'sources', jsonb_build_array()))
    );
    raise exception 'A detached snapshot must not accept refresh.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

do $$
declare
  changed_rows int;
begin
  if exists (
    select 1
    from public.grocery_lists
    where owner_id = '12000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Owner two must not see owner one grocery lists.';
  end if;

  if exists (select 1 from public.grocery_list_items)
    or exists (select 1 from public.grocery_list_item_sources) then
    raise exception 'Owner two must not read owner one grocery items or sources.';
  end if;

  begin
    insert into public.grocery_list_items (grocery_list_id, name)
    values ('62000000-0000-0000-0000-000000000001', 'Forbidden item');
    raise exception 'Owner two must not insert into owner one grocery lists.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.grocery_lists (
      owner_id,
      meal_plan_id,
      title,
      source_type,
      source_week_start_date
    ) values (
      '12000000-0000-0000-0000-000000000002',
      '42000000-0000-0000-0000-000000000003',
      'Forbidden owner-one week',
      'meal_plan'::public.grocery_list_source_type,
      '2026-08-24'
    );
    raise exception 'Owner two must not attach owner one meal plans.';
  exception
    when insufficient_privilege then null;
  end;

  insert into public.grocery_lists (id, owner_id, title)
  values (
    '62000000-0000-0000-0000-000000000010',
    '12000000-0000-0000-0000-000000000002',
    'Owner two manual list'
  );

  insert into public.grocery_list_items (id, grocery_list_id, name)
  values (
    '72000000-0000-0000-0000-000000000010',
    '62000000-0000-0000-0000-000000000010',
    'Owner two item'
  );

  begin
    insert into public.grocery_list_item_sources (
      grocery_list_item_id,
      recipe_id,
      recipe_ingredient_id,
      recipe_title,
      ingredient_name,
      ingredient_amount,
      saved_servings,
      target_servings,
      scale_factor,
      contributed_amount,
      sort_order
    ) values (
      '72000000-0000-0000-0000-000000000010',
      '22000000-0000-0000-0000-000000000002',
      '32000000-0000-0000-0000-000000000003',
      'Owner one tray bake',
      'Broccoli',
      1,
      2,
      2,
      1,
      1,
      0
    );
    raise exception 'Owner two sources must not attach owner one recipe data.';
  exception
    when insufficient_privilege then null;
  end;

  update public.grocery_lists
  set title = 'Forbidden update'
  where id = '62000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Owner two must not update owner one grocery lists.';
  end if;

  update public.grocery_list_items
  set checked = true
  where id = '72000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Owner two must not update owner one grocery items.';
  end if;

  delete from public.grocery_list_items
  where id = '72000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Owner two must not delete owner one grocery items.';
  end if;

  delete from public.grocery_list_item_sources
  where recipe_title = 'Owner one tray bake';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Owner two must not delete owner one grocery sources.';
  end if;

  delete from public.grocery_lists
  where id = '62000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Owner two must not delete owner one grocery lists.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

delete from public.recipes
where id = '22000000-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1
    from public.grocery_list_item_sources
    where recipe_title = 'Owner one curry'
      and recipe_id is null
      and recipe_ingredient_id is null
  ) then
    raise exception 'Recipe deletion must retain grocery source snapshot text.';
  end if;
end;
$$;

delete from public.grocery_lists
where id = '62000000-0000-0000-0000-000000000001';

do $$
begin
  if exists (
    select 1 from public.grocery_list_items
    where grocery_list_id = '62000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Deleting a grocery list must cascade its items.';
  end if;
end;
$$;

rollback;
