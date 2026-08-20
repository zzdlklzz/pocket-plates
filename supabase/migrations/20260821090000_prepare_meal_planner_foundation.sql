-- Make the existing meal-planning tables available to signed-in browser clients
-- while keeping row-level security as the ownership boundary.
grant select, insert, update, delete on table public.meal_plans to authenticated;
grant select, insert, update, delete on table public.meal_plan_entries to authenticated;

do $$
begin
  if exists (
    select 1
    from public.meal_plans
    group by owner_id, week_start_date
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Cannot enforce one meal plan per owner and week: duplicate rows already exist.';
  end if;

  if exists (
    select 1
    from public.meal_plan_entries
    group by meal_plan_id, planned_for, meal_type, recipe_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Cannot prevent duplicate meal-plan entries: duplicate rows already exist.';
  end if;
end;
$$;

alter table public.meal_plans
add constraint meal_plans_owner_week_key
unique (owner_id, week_start_date);

alter table public.meal_plan_entries
add constraint meal_plan_entries_exact_entry_key
unique (meal_plan_id, planned_for, meal_type, recipe_id);

-- The unique constraints provide the same leading-column lookup paths.
drop index public.meal_plans_owner_week_idx;
drop index public.meal_plan_entries_plan_date_idx;
