# Sync the meal-planner search mockup

## Why

The meal-planner documentation described the new visible recipe-search results, but the approved SVG still showed the older Add meal sheet without a search field or result list.

## What changed

- Updated only the Add meal phone in the existing weekly planner SVG.
- Added a title-or-ingredient search state, visible match count, bounded result panel, ingredient context, and a scroll cue for longer result lists.
- Retained the existing Recipe dropdown, editable in-week day, one-serving default, and Add action so the mockup continues to match the implemented flow.
- Updated the SVG description and Add meal caption to explain the bounded, scrollable results.

The current behavior was already documented in `README.md`, `docs/ARCHITECTURE.md`, and `docs/project-plan.md`, so those files required no further wording changes.

## Files

Modified:

- `docs/assets/meal-planner-mockups.svg`

Created:

- `docs/changelog/2026-08-21-1709-sync-planner-search-mockup.md`

## Localized structure

```text
docs
├── assets
│   └── meal-planner-mockups.svg
└── changelog
    └── 2026-08-21-1709-sync-planner-search-mockup.md
```

## Verification

- `xmllint --noout docs/assets/meal-planner-mockups.svg` passed.
- The SVG rendered successfully to a 1990 × 1040 PNG for visual inspection.
- The updated Add meal sheet remains inside its mobile frame without clipping or overlap.
- `git diff --check` passed.
