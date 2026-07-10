create extension if not exists pgcrypto;

create type public.meal_type as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'flexible'
);

create type public.recipe_visibility as enum (
  'private',
  'shared',
  'public'
);

create type public.cost_rating as enum (
  'very_cheap',
  'cheap',
  'moderate',
  'splurge'
);

create type public.difficulty_level as enum (
  'easy',
  'medium',
  'hard',
  'beginner_friendly'
);

create type public.pantry_item_status as enum (
  'active',
  'archived'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text,
  summary text,
  notes text,
  servings int not null default 1 check (servings > 0),
  prep_minutes int check (prep_minutes is null or prep_minutes >= 0),
  cook_minutes int check (cook_minutes is null or cook_minutes >= 0),
  cost_rating public.cost_rating,
  difficulty public.difficulty_level,
  estimated_total_cost numeric check (estimated_total_cost is null or estimated_total_cost >= 0),
  visibility public.recipe_visibility not null default 'private',
  image_url text,
  image_storage_path text,
  source_name text,
  source_url text,
  is_favorite boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table public.recipe_meal_types (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  meal_type public.meal_type not null,
  created_at timestamptz not null default now(),
  primary key (recipe_id, meal_type)
);

create table public.recipe_links (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  notes text,
  group_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  instruction text not null,
  timer_minutes int check (timer_minutes is null or timer_minutes >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id)
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);

create table public.recipe_equipment (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, equipment_id)
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  default_unit text,
  estimated_unit_cost numeric check (estimated_unit_cost is null or estimated_unit_cost >= 0),
  status public.pantry_item_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  planned_for date not null,
  meal_type public.meal_type not null default 'flexible',
  servings int not null default 1 check (servings > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  meal_plan_id uuid references public.meal_plans (id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists (id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  checked boolean not null default false,
  source_recipe_id uuid references public.recipes (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_owner_created_at_idx on public.recipes (owner_id, created_at desc);
create index recipes_owner_cost_idx on public.recipes (owner_id, cost_rating);
create index recipes_owner_difficulty_idx on public.recipes (owner_id, difficulty);
create index recipes_visibility_published_idx on public.recipes (visibility, published_at desc);
create index recipes_owner_favorite_idx on public.recipes (owner_id, is_favorite);
create index recipe_meal_types_meal_type_idx on public.recipe_meal_types (meal_type);
create index recipe_links_recipe_sort_idx on public.recipe_links (recipe_id, sort_order);
create index recipe_ingredients_recipe_sort_idx on public.recipe_ingredients (recipe_id, sort_order);
create index recipe_ingredients_name_idx on public.recipe_ingredients (name);
create index recipe_steps_recipe_sort_idx on public.recipe_steps (recipe_id, sort_order);
create index recipe_tags_tag_idx on public.recipe_tags (tag_id);
create index recipe_equipment_equipment_idx on public.recipe_equipment (equipment_id);
create index meal_plans_owner_week_idx on public.meal_plans (owner_id, week_start_date);
create index meal_plan_entries_plan_date_idx on public.meal_plan_entries (meal_plan_id, planned_for);
create index meal_plan_entries_recipe_idx on public.meal_plan_entries (recipe_id);
create index grocery_list_items_list_sort_idx on public.grocery_list_items (grocery_list_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create trigger set_recipe_ingredients_updated_at
before update on public.recipe_ingredients
for each row execute function public.set_updated_at();

create trigger set_recipe_steps_updated_at
before update on public.recipe_steps
for each row execute function public.set_updated_at();

create trigger set_pantry_items_updated_at
before update on public.pantry_items
for each row execute function public.set_updated_at();

create trigger set_meal_plans_updated_at
before update on public.meal_plans
for each row execute function public.set_updated_at();

create trigger set_grocery_lists_updated_at
before update on public.grocery_lists
for each row execute function public.set_updated_at();

create trigger set_grocery_list_items_updated_at
before update on public.grocery_list_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_meal_types enable row level security;
alter table public.recipe_links enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.equipment enable row level security;
alter table public.recipe_equipment enable row level security;
alter table public.pantry_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;

-- Initial launch uses open signup with private owner-scoped data.
-- Public recipe read policies should be added only when community discovery ships.
create policy "profiles are owned by the signed-in user"
on public.profiles for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "recipes are owned by the signed-in user"
on public.recipes for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "recipe meal types follow recipe ownership"
on public.recipe_meal_types for all
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_meal_types.recipe_id
  and recipes.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_meal_types.recipe_id
  and recipes.owner_id = auth.uid()
));

create policy "recipe links follow recipe ownership"
on public.recipe_links for all
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_links.recipe_id
  and recipes.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_links.recipe_id
  and recipes.owner_id = auth.uid()
));

create policy "recipe ingredients follow recipe ownership"
on public.recipe_ingredients for all
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_ingredients.recipe_id
  and recipes.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_ingredients.recipe_id
  and recipes.owner_id = auth.uid()
));

create policy "recipe steps follow recipe ownership"
on public.recipe_steps for all
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_steps.recipe_id
  and recipes.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_steps.recipe_id
  and recipes.owner_id = auth.uid()
));

create policy "tags are owned by the signed-in user"
on public.tags for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "recipe tags follow recipe and tag ownership"
on public.recipe_tags for all
using (exists (
  select 1
  from public.recipes
  join public.tags on tags.id = recipe_tags.tag_id
  where recipes.id = recipe_tags.recipe_id
  and recipes.owner_id = auth.uid()
  and tags.owner_id = auth.uid()
))
with check (exists (
  select 1
  from public.recipes
  join public.tags on tags.id = recipe_tags.tag_id
  where recipes.id = recipe_tags.recipe_id
  and recipes.owner_id = auth.uid()
  and tags.owner_id = auth.uid()
));

create policy "equipment is owned by the signed-in user"
on public.equipment for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "recipe equipment follows recipe and equipment ownership"
on public.recipe_equipment for all
using (exists (
  select 1
  from public.recipes
  join public.equipment on equipment.id = recipe_equipment.equipment_id
  where recipes.id = recipe_equipment.recipe_id
  and recipes.owner_id = auth.uid()
  and equipment.owner_id = auth.uid()
))
with check (exists (
  select 1
  from public.recipes
  join public.equipment on equipment.id = recipe_equipment.equipment_id
  where recipes.id = recipe_equipment.recipe_id
  and recipes.owner_id = auth.uid()
  and equipment.owner_id = auth.uid()
));

create policy "pantry items are owned by the signed-in user"
on public.pantry_items for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "meal plans are owned by the signed-in user"
on public.meal_plans for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "meal plan entries follow meal plan ownership"
on public.meal_plan_entries for all
using (exists (
  select 1
  from public.meal_plans
  join public.recipes on recipes.id = meal_plan_entries.recipe_id
  where meal_plans.id = meal_plan_entries.meal_plan_id
  and meal_plans.owner_id = auth.uid()
  and recipes.owner_id = auth.uid()
))
with check (exists (
  select 1
  from public.meal_plans
  join public.recipes on recipes.id = meal_plan_entries.recipe_id
  where meal_plans.id = meal_plan_entries.meal_plan_id
  and meal_plans.owner_id = auth.uid()
  and recipes.owner_id = auth.uid()
));

create policy "grocery lists are owned by the signed-in user"
on public.grocery_lists for all
using (
  owner_id = auth.uid()
  and (
    meal_plan_id is null
    or exists (
      select 1 from public.meal_plans
      where meal_plans.id = grocery_lists.meal_plan_id
      and meal_plans.owner_id = auth.uid()
    )
  )
)
with check (
  owner_id = auth.uid()
  and (
    meal_plan_id is null
    or exists (
      select 1 from public.meal_plans
      where meal_plans.id = grocery_lists.meal_plan_id
      and meal_plans.owner_id = auth.uid()
    )
  )
);

create policy "grocery list items follow grocery list ownership"
on public.grocery_list_items for all
using (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
  and grocery_lists.owner_id = auth.uid()
  and (
    grocery_list_items.source_recipe_id is null
    or exists (
      select 1 from public.recipes
      where recipes.id = grocery_list_items.source_recipe_id
      and recipes.owner_id = auth.uid()
    )
  )
))
with check (exists (
  select 1
  from public.grocery_lists
  where grocery_lists.id = grocery_list_items.grocery_list_id
  and grocery_lists.owner_id = auth.uid()
  and (
    grocery_list_items.source_recipe_id is null
    or exists (
      select 1 from public.recipes
      where recipes.id = grocery_list_items.source_recipe_id
      and recipes.owner_id = auth.uid()
    )
  )
));
