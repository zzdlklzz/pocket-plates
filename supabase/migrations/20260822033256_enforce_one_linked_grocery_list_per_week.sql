do $$
declare
  duplicate_group_count bigint;
begin
  select count(*)
  into duplicate_group_count
  from (
    select grocery_list.owner_id, grocery_list.source_week_start_date
    from public.grocery_lists as grocery_list
    where grocery_list.source_type =
        'meal_plan'::public.grocery_list_source_type
      and grocery_list.meal_plan_id is not null
    group by grocery_list.owner_id, grocery_list.source_week_start_date
    having count(*) > 1
  ) as duplicate_group;

  if duplicate_group_count > 0 then
    raise exception using
      errcode = '23505',
      message = format(
        'Cannot enforce one linked grocery list per meal-plan week: %s duplicate owner/week group(s) exist.',
        duplicate_group_count
      ),
      detail = 'Resolve duplicate linked meal-plan grocery lists before retrying this migration.';
  end if;
end;
$$;

create unique index grocery_lists_one_linked_meal_plan_week_idx
on public.grocery_lists (owner_id, source_week_start_date)
where source_type = 'meal_plan'::public.grocery_list_source_type
  and meal_plan_id is not null;
