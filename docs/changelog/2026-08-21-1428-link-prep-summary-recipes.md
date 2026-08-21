# Link prep-summary recipes

## Why

The weekly prep summary provided portion and scaling guidance but did not offer a direct path back to an active recipe's ingredients and instructions.

## What changed

- Made each active recipe title in the prep summary a clear, touch-sized link to its existing recipe detail page.
- Kept archived recipe titles non-navigable and visibly labelled, matching the existing meal-plan entry behavior.
- Preserved the read-only summary calculation, dialog interactions, ordering, and layout.
- Added focused coverage for active recipe destinations and archived recipe behavior.

## Files changed

Created:

- `docs/changelog/2026-08-21-1428-link-prep-summary-recipes.md`

Modified:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/project-plan.md`
- `src/features/meal-planning/MealPlanPrepDialog.tsx`
- `src/features/meal-planning/__tests__/MealPlanPrepDialog.test.tsx`

Deleted: none.

## Localized structure

```text
recipe-app/
├── docs/
│   ├── changelog/2026-08-21-1428-link-prep-summary-recipes.md
│   ├── ARCHITECTURE.md
│   └── project-plan.md
├── src/features/meal-planning/
│   ├── __tests__/MealPlanPrepDialog.test.tsx
│   └── MealPlanPrepDialog.tsx
└── README.md
```

## Verification

- Focused prep-summary dialog tests.
- TypeScript and focused ESLint checks.
- Diff and current-document consistency checks.
