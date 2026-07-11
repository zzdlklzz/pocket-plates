drop policy if exists "profiles are owned by the signed-in user" on public.profiles;
drop policy if exists "recipes are owned by the signed-in user" on public.recipes;
drop policy if exists "recipe meal types follow recipe ownership" on public.recipe_meal_types;
drop policy if exists "recipe links follow recipe ownership" on public.recipe_links;
drop policy if exists "recipe ingredients follow recipe ownership" on public.recipe_ingredients;
drop policy if exists "recipe steps follow recipe ownership" on public.recipe_steps;
drop policy if exists "tags are owned by the signed-in user" on public.tags;
drop policy if exists "recipe tags follow recipe and tag ownership" on public.recipe_tags;
drop policy if exists "equipment is owned by the signed-in user" on public.equipment;
drop policy if exists "recipe equipment follows recipe and equipment ownership" on public.recipe_equipment;
drop policy if exists "pantry items are owned by the signed-in user" on public.pantry_items;
drop policy if exists "meal plans are owned by the signed-in user" on public.meal_plans;
drop policy if exists "meal plan entries follow meal plan ownership" on public.meal_plan_entries;
drop policy if exists "grocery lists are owned by the signed-in user" on public.grocery_lists;
drop policy if exists "grocery list items follow grocery list ownership" on public.grocery_list_items;

-- Keep launch data private and owner-scoped while making the target role explicit.
create policy "profiles are owned by the signed-in user"
on public.profiles for all
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "recipes are owned by the signed-in user"
on public.recipes for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "recipe meal types follow recipe ownership"
on public.recipe_meal_types for all
to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_meal_types.recipe_id
  and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_meal_types.recipe_id
  and recipes.owner_id = (select auth.uid())
));

create policy "recipe links follow recipe ownership"
on public.recipe_links for all
to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_links.recipe_id
  and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_links.recipe_id
  and recipes.owner_id = (select auth.uid())
));

create policy "recipe ingredients follow recipe ownership"
on public.recipe_ingredients for all
to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_ingredients.recipe_id
  and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_ingredients.recipe_id
  and recipes.owner_id = (select auth.uid())
));

create policy "recipe steps follow recipe ownership"
on public.recipe_steps for all
to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_steps.recipe_id
  and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_steps.recipe_id
  and recipes.owner_id = (select auth.uid())
));

create policy "tags are owned by the signed-in user"
on public.tags for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "recipe tags follow recipe and tag ownership"
on public.recipe_tags for all
to authenticated
using (exists (
  select 1
  from public.recipes
  join public.tags on tags.id = recipe_tags.tag_id
  where recipes.id = recipe_tags.recipe_id
  and recipes.owner_id = (select auth.uid())
  and tags.owner_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.recipes
  join public.tags on tags.id = recipe_tags.tag_id
  where recipes.id = recipe_tags.recipe_id
  and recipes.owner_id = (select auth.uid())
  and tags.owner_id = (select auth.uid())
));

create policy "equipment is owned by the signed-in user"
on public.equipment for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "recipe equipment follows recipe and equipment ownership"
on public.recipe_equipment for all
to authenticated
using (exists (
  select 1
  from public.recipes
  join public.equipment on equipment.id = recipe_equipment.equipment_id
  where recipes.id = recipe_equipment.recipe_id
  and recipes.owner_id = (select auth.uid())
  and equipment.owner_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.recipes
  join public.equipment on equipment.id = recipe_equipment.equipment_id
  where recipes.id = recipe_equipment.recipe_id
  and recipes.owner_id = (select auth.uid())
  and equipment.owner_id = (select auth.uid())
));

create policy "pantry items are owned by the signed-in user"
on public.pantry_items for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "meal plans are owned by the signed-in user"
on public.meal_plans for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "meal plan entries follow meal plan ownership"
on public.meal_plan_entries for all
to authenticated
using (exists (
  select 1
  from public.meal_plans
  join public.recipes on recipes.id = meal_plan_entries.recipe_id
  where meal_plans.id = meal_plan_entries.meal_plan_id
  and meal_plans.owner_id = (select auth.uid())
  and recipes.owner_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.meal_plans
  join public.recipes on recipes.id = meal_plan_entries.recipe_id
  where meal_plans.id = meal_plan_entries.meal_plan_id
  and meal_plans.owner_id = (select auth.uid())
  and recipes.owner_id = (select auth.uid())
));

create policy "grocery lists are owned by the signed-in user"
on public.grocery_lists for all
to authenticated
using (
  owner_id = (select auth.uid())
  and (
    meal_plan_id is null
    or exists (
      select 1 from public.meal_plans
      where meal_plans.id = grocery_lists.meal_plan_id
      and meal_plans.owner_id = (select auth.uid())
    )
  )
)
with check (
  owner_id = (select auth.uid())
  and (
    meal_plan_id is null
    or exists (
      select 1 from public.meal_plans
      where meal_plans.id = grocery_lists.meal_plan_id
      and meal_plans.owner_id = (select auth.uid())
    )
  )
);

create policy "grocery list items follow grocery list ownership"
on public.grocery_list_items for all
to authenticated
using (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
  and grocery_lists.owner_id = (select auth.uid())
  and (
    grocery_list_items.source_recipe_id is null
    or exists (
      select 1 from public.recipes
      where recipes.id = grocery_list_items.source_recipe_id
      and recipes.owner_id = (select auth.uid())
    )
  )
))
with check (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
  and grocery_lists.owner_id = (select auth.uid())
  and (
    grocery_list_items.source_recipe_id is null
    or exists (
      select 1 from public.recipes
      where recipes.id = grocery_list_items.source_recipe_id
      and recipes.owner_id = (select auth.uid())
    )
  )
));
