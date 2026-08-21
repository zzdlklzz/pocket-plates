# Select a planner day while adding

## Why

The planner opened Add meal from a specific day but locked that date in the sheet. Changing the destination required closing the sheet and finding another day action, which added unnecessary friction when planning several future days.

## What changed

- Reused the existing seven-date Day selector in both add and edit modes, following `docs/assets/meal-planner-mockups.svg` without rebuilding the current sheet.
- Kept the day that opened the sheet as the initial selection and limited choices to the displayed Monday-through-Sunday week.
- Submitted the selected date through the existing add mutation with no new repository, query, global state, or database behavior.
- Returned focus to the selected target day's existing Add meal action after success, including when it differs from the opener.
- Added focused coverage for the initial day, an exact seven-day year-boundary list, a changed target date, pending state, and focus return.

## Files changed

Created:

- `docs/changelog/2026-08-21-1237-select-planner-day-while-adding.md`

Modified:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/project-plan.md`
- `src/features/meal-planning/MealPlanEntrySheet.tsx`
- `src/features/meal-planning/MealPlanner.tsx`
- `src/features/meal-planning/__tests__/MealPlanEntrySheet.test.tsx`
- `src/features/meal-planning/__tests__/MealPlanner.test.tsx`

Deleted: none.

## Localized structure

```text
recipe-app/
├── docs/
│   ├── changelog/2026-08-21-1237-select-planner-day-while-adding.md
│   ├── ARCHITECTURE.md
│   └── project-plan.md
├── src/features/meal-planning/
│   ├── __tests__/
│   │   ├── MealPlanEntrySheet.test.tsx
│   │   └── MealPlanner.test.tsx
│   ├── MealPlanEntrySheet.tsx
│   └── MealPlanner.tsx
└── README.md
```

## Verification

- Focused Add meal sheet and planner component tests.
- Full meal-planning test suite.
- TypeScript, focused ESLint, and diff validation.
