# Prepare the weekly meal-planner foundation

## Why

The existing schema already contained meal-plan tables, but browser clients did not yet have an explicit CRUD contract and repeated writes could create duplicate weekly plans or exact duplicate entries. The planner also needs one timezone-safe definition of a Monday-through-Sunday week before UI and repository work begin.

## What changed

- Granted authenticated clients select, insert, update, and delete access to `meal_plans` and `meal_plan_entries`, with the existing RLS policies remaining the owner boundary.
- Added explicit duplicate-data checks before installing unique owner/week and exact-entry constraints; the migration fails instead of choosing data to remove.
- Replaced the redundant non-unique owner/week and plan/date indexes with the corresponding unique constraint indexes.
- Added transactional SQL coverage for grants, two-user isolation, cross-owner recipe protection, CRUD, and both uniqueness rules.
- Added small local-calendar date helpers for ISO parsing/formatting, Monday normalization, seven-day generation, week membership, and adjacent-week movement.
- Added boundary tests across weekdays, month/year changes, leap day, invalid inputs, and time zones on both sides of UTC.
- Kept the checked-in Supabase TypeScript types unchanged because grants and constraints do not alter generated row or function shapes. Local regeneration was attempted, but this CLI version's generator container could not connect to the local database.
- Updated current database diagrams and implementation tracking. No user-facing planner route is included in this slice.

## Data boundary

```mermaid
flowchart LR
    user["Authenticated user"] --> grants["Planner table CRUD grants"]
    grants --> rls["Existing owner-scoped RLS"]
    rls --> plan["One meal plan per owner and week"]
    plan --> entries["Unique exact recipe/date/slot entries"]
```

## Files changed

Created:

- `docs/changelog/2026-08-21-0044-prepare-meal-planner-foundation.md`
- `src/features/meal-planning/meal-planning.dates.ts`
- `src/features/meal-planning/meal-planning.types.ts`
- `src/features/meal-planning/__tests__/meal-planning.dates.test.ts`
- `supabase/migrations/20260821090000_prepare_meal_planner_foundation.sql`
- `supabase/tests/meal_planner_foundation.sql`

Modified:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/database-erd.mmd`
- `docs/database-schema.dbml`
- `docs/project-plan.md`

Deleted: none.

## Localized structure

```text
recipe-app/
├── docs/
│   ├── changelog/2026-08-21-0044-prepare-meal-planner-foundation.md
│   ├── ARCHITECTURE.md
│   ├── database-erd.mmd
│   ├── database-schema.dbml
│   └── project-plan.md
├── src/features/meal-planning/
│   ├── __tests__/meal-planning.dates.test.ts
│   ├── meal-planning.dates.ts
│   └── meal-planning.types.ts
├── supabase/
│   ├── migrations/20260821090000_prepare_meal_planner_foundation.sql
│   └── tests/meal_planner_foundation.sql
└── README.md
```

## Verification

- Clean local Supabase reset and schema lint.
- Transactional meal-planner SQL integration test.
- Confirmed that the migration adds no generated row or function shape; local type regeneration was blocked by the CLI generator container's database connection.
- Targeted date tests in the normal test environment and in ahead/behind-UTC time zones.
- Full lint, typecheck, unit tests, and diff consistency checks.
