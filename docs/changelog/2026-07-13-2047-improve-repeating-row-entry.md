# Improve Repeating Row Entry

## What Changed

- Moved the source, ingredient, and step add actions below their respective lists.
- Replaced generic `Add` labels with explicit `Add source`, `Add ingredient`, and `Add step` labels.
- Made each add action a full-width mobile target.
- Focused the primary field in every newly appended row so entry can continue without navigating back through the page.
- Updated component coverage for the explicit actions and focus behavior.
- Updated architecture and roadmap documentation for the mobile entry workflow.

## Why

Long ingredient and step lists pushed their add actions far above the user's current position. Placing each action where the list ends keeps the form moving in one direction and avoids repeated upward scrolling on mobile. Applying the same interaction to sources keeps all repeating form sections predictable.

## Changed Files

- Modified `src/features/recipes/recipe-form-fields.tsx`.
- Modified `src/features/recipes/__tests__/recipe-form.test.tsx`.
- Modified `docs/ARCHITECTURE.md`.
- Modified `docs/project-plan.md`.
- Created `docs/changelog/2026-07-13-2047-improve-repeating-row-entry.md`.

## Localized Structure

```text
recipe-app/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── project-plan.md
│   └── changelog/
│       └── 2026-07-13-2047-improve-repeating-row-entry.md
└── src/features/recipes/
    ├── __tests__/
    │   └── recipe-form.test.tsx
    └── recipe-form-fields.tsx
```
