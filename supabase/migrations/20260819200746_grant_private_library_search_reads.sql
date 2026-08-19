-- The private-library search function is SECURITY INVOKER, so callers need
-- read access to its source tables. RLS continues to enforce owner isolation.

grant select on table public.recipes to authenticated;
grant select on table public.recipe_meal_types to authenticated;
grant select on table public.recipe_ingredients to authenticated;
