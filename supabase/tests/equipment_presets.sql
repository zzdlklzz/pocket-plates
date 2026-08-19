begin;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'equipment-owner-one@example.test', '{}'::jsonb, '{}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'equipment-owner-two@example.test', '{}'::jsonb, '{}'::jsonb);

insert into public.recipes (id, owner_id, title)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Fast rice'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Other rice');

insert into public.recipe_ingredients (recipe_id, name)
values
  ('20000000-0000-0000-0000-000000000001', 'Jasmine rice'),
  ('20000000-0000-0000-0000-000000000002', 'Brown rice');

insert into public.equipment (id, owner_id, label)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Air fryer'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Other owner tool');

insert into public.recipe_equipment (recipe_id, equipment_id)
values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select public.replace_recipe_discovery_metadata(
  '20000000-0000-0000-0000-000000000001',
  array['quick', 'one_pot']::public.recipe_effort_label[],
  array['microwave', 'rice_cooker']::text[]
);

select public.replace_recipe_discovery_metadata(
  '20000000-0000-0000-0000-000000000001',
  array['quick', 'one_pot']::public.recipe_effort_label[],
  array['microwave', 'rice_cooker']::text[]
);

do $$
begin
  if (select count(*) from public.equipment where preset_key is not null) <> 2 then
    raise exception 'Repeated saves must reuse owner equipment catalog rows.';
  end if;

  if (select count(*) from public.list_private_library_recipes(
    'jasmine',
    null,
    null,
    null,
    array['quick', 'one_pot']::public.recipe_effort_label[],
    array['microwave', 'rice_cooker']::text[]
  )) <> 1 then
    raise exception 'Combined search, effort, and match-all equipment filters must return the recipe.';
  end if;

  begin
    perform public.replace_recipe_discovery_metadata(
      '20000000-0000-0000-0000-000000000001',
      array['quick']::public.recipe_effort_label[],
      array['oven', 'no_oven']::text[]
    );
    raise exception 'Conflicting oven choices should fail.';
  exception
    when invalid_parameter_value then null;
  end;

  if (select count(*) from public.recipe_equipment join public.equipment on equipment.id = recipe_equipment.equipment_id where recipe_id = '20000000-0000-0000-0000-000000000001' and preset_key is not null) <> 2 then
    raise exception 'A rejected equipment replacement must leave existing metadata intact.';
  end if;

  begin
    perform public.replace_recipe_discovery_metadata(
      '20000000-0000-0000-0000-000000000002',
      '{}'::public.recipe_effort_label[],
      array['microwave']::text[]
    );
    raise exception 'Cross-owner metadata replacement should fail.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.recipe_equipment (recipe_id, equipment_id)
    values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002');
    raise exception 'Cross-owner equipment joins should fail.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select public.replace_recipe_discovery_metadata(
  '20000000-0000-0000-0000-000000000001',
  array['low_cleanup']::public.recipe_effort_label[],
  array['no_oven']::text[]
);

do $$
begin
  if not exists (
    select 1
    from public.recipe_equipment
    where recipe_id = '20000000-0000-0000-0000-000000000001'
      and equipment_id = '30000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Replacing controlled equipment must preserve custom null-key links.';
  end if;

  if exists (
    select 1
    from public.recipe_equipment
    join public.equipment on equipment.id = recipe_equipment.equipment_id
    where recipe_id = '20000000-0000-0000-0000-000000000001'
      and preset_key in ('microwave', 'rice_cooker')
  ) then
    raise exception 'Deselected controlled equipment links must be removed.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select public.replace_recipe_discovery_metadata(
  '20000000-0000-0000-0000-000000000002',
  array['quick']::public.recipe_effort_label[],
  array['microwave']::text[]
);

do $$
begin
  if (select count(*) from public.list_private_library_recipes(null, null, null, null, null, null)) <> 1 then
    raise exception 'The list function must remain owner scoped.';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  begin
    perform public.list_private_library_recipes(null, null, null, null, null, null);
    raise exception 'Anonymous callers should not execute the private list function.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
