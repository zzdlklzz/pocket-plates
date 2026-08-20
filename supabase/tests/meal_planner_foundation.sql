begin;

do $$
declare
  table_name text;
  privilege_name text;
begin
  foreach table_name in array array['meal_plans', 'meal_plan_entries']
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
end;
$$;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('11000000-0000-0000-0000-000000000001', 'planner-owner-one@example.test', '{}'::jsonb, '{}'::jsonb),
  ('11000000-0000-0000-0000-000000000002', 'planner-owner-two@example.test', '{}'::jsonb, '{}'::jsonb);

insert into public.recipes (id, owner_id, title)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Owner one breakfast'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Owner one second breakfast'),
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'Owner two breakfast');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

insert into public.meal_plans (id, owner_id, week_start_date)
values (
  '31000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  '2026-08-17'
);

insert into public.meal_plan_entries (
  id,
  meal_plan_id,
  recipe_id,
  planned_for,
  meal_type,
  servings
)
values (
  '41000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '2026-08-17',
  'breakfast',
  2
);

do $$
begin
  begin
    insert into public.meal_plans (owner_id, week_start_date)
    values ('11000000-0000-0000-0000-000000000001', '2026-08-17');
    raise exception 'An owner should not have two plans for one week.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.meal_plan_entries (meal_plan_id, recipe_id, planned_for, meal_type)
    values (
      '31000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000001',
      '2026-08-17',
      'breakfast'
    );
    raise exception 'An exact meal-plan entry duplicate should fail.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.meal_plan_entries (meal_plan_id, recipe_id, planned_for, meal_type)
    values (
      '31000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000003',
      '2026-08-18',
      'breakfast'
    );
    raise exception 'A cross-owner recipe should not be added to a meal plan.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.meal_plans (owner_id, week_start_date)
    values ('11000000-0000-0000-0000-000000000002', '2026-08-24');
    raise exception 'A signed-in user should not create another owner''s plan.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Different recipes may share a day and meal slot.
insert into public.meal_plan_entries (
  id,
  meal_plan_id,
  recipe_id,
  planned_for,
  meal_type
)
values (
  '41000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000002',
  '2026-08-17',
  'breakfast'
);

update public.meal_plans
set title = 'Owner one week'
where id = '31000000-0000-0000-0000-000000000001';

update public.meal_plan_entries
set servings = 3
where id = '41000000-0000-0000-0000-000000000001';

do $$
begin
  if (select count(*) from public.meal_plans) <> 1 then
    raise exception 'Owner one should see only their own plan.';
  end if;

  if (select count(*) from public.meal_plan_entries) <> 2 then
    raise exception 'Owner one should see both same-slot recipes in their plan.';
  end if;

  if (select servings from public.meal_plan_entries where id = '41000000-0000-0000-0000-000000000001') <> 3 then
    raise exception 'An owner should be able to update their meal-plan entry.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);

insert into public.meal_plans (id, owner_id, week_start_date)
values (
  '31000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000002',
  '2026-08-17'
);

insert into public.meal_plan_entries (
  id,
  meal_plan_id,
  recipe_id,
  planned_for,
  meal_type
)
values (
  '41000000-0000-0000-0000-000000000003',
  '31000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000003',
  '2026-08-17',
  'breakfast'
);

do $$
declare
  changed_rows integer;
begin
  if (select count(*) from public.meal_plans) <> 1 then
    raise exception 'Owner two should see only their own plan.';
  end if;

  if (select count(*) from public.meal_plan_entries) <> 1 then
    raise exception 'Owner two should see only their own entries.';
  end if;

  update public.meal_plans
  set title = 'Forbidden update'
  where id = '31000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'A user should not update another owner''s plan.';
  end if;

  delete from public.meal_plan_entries
  where id = '41000000-0000-0000-0000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'A user should not delete another owner''s entry.';
  end if;
end;
$$;

delete from public.meal_plan_entries
where id = '41000000-0000-0000-0000-000000000003';

do $$
begin
  if exists (
    select 1
    from public.meal_plan_entries
    where id = '41000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'An owner should be able to delete their meal-plan entry.';
  end if;
end;
$$;

rollback;
