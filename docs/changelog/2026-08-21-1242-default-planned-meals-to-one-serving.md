# Default planned meals to one serving

## Why

The Add meal sheet previously copied a recipe's saved yield into each new meal-plan entry. That made a four-serving recipe look like four planned portions even when one person intended to eat one portion. Saved recipe yield and planned portions are separate concepts.

## What changed

- Kept every new meal-plan entry at one planned serving by default, even after selecting or changing a recipe.
- Preserved the existing recipe-based meal-type suggestion without letting recipe selection overwrite a user's planned-serving choice.
- Renamed the field to Planned servings and associated concise one-person guidance with the input for assistive technology.
- Displayed the selected recipe's saved yield as read-only context using recipe option data already loaded by the sheet.
- Preserved existing planned servings and displayed the saved yield when editing an active or archived entry.
- Added focused coverage for the initial default, recipe changes, user overrides, accessible guidance, saved-yield context, and unchanged edit values.

## Files changed

Created:

- `docs/changelog/2026-08-21-1242-default-planned-meals-to-one-serving.md`

Modified:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/project-plan.md`
- `src/features/meal-planning/MealPlanEntrySheet.tsx`
- `src/features/meal-planning/__tests__/MealPlanEntrySheet.test.tsx`
- `src/features/meal-planning/__tests__/MealPlanner.test.tsx`

Deleted: none.

## Localized structure

```text
recipe-app/
├── docs/
│   ├── changelog/2026-08-21-1242-default-planned-meals-to-one-serving.md
│   ├── ARCHITECTURE.md
│   └── project-plan.md
├── src/features/meal-planning/
│   ├── __tests__/
│   │   ├── MealPlanEntrySheet.test.tsx
│   │   └── MealPlanner.test.tsx
│   └── MealPlanEntrySheet.tsx
└── README.md
```

## Verification

- Focused Add/Edit meal sheet and planner component tests.
- Full meal-planning test suite.
- TypeScript, focused ESLint, and diff validation.
