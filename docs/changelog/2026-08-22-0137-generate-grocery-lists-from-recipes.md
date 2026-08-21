# Generate Grocery Lists From Saved Recipes

## What changed

- Added a one-page selected-recipe grocery generator with complete owner-scoped title-or-ingredient search, add-once selection, per-recipe target servings, a freshly loaded grouped preview, and atomic creation.
- Kept the approved name-first shopping model: compatible units total together, incompatible units remain inside one product, missing quantities appear as `extra`, and every recipe contribution remains available in the source disclosure.
- Added generated-item practical shopping amounts that can be cleared back to the original recipe requirements without changing snapshot history.
- Added a frozen selected-recipe count to grocery-list summaries and details. The database derives it during atomic creation so it survives later item or source-recipe deletion.
- Enforced the ten-recipe boundary in both the application and database function, kept the 300-product failure actionable, and prevented stale or failed previews from being created.
- Invalidated grocery recipe-search and preview caches after recipe changes so archived or edited recipes are not reused as current generator inputs.
- Extended the signed-in mobile and desktop grocery journey through grouped generation, overrides, reloads, and durable source history after one source recipe is archived.

## Why

This completes the selected-recipe generation slice while keeping creation predictable: users review one fresh snapshot, the server revalidates the same authoritative recipes, and one transaction either creates the complete list or creates nothing.

```mermaid
flowchart LR
    A["Search active recipes"] --> B["Choose servings"]
    B --> C["Fresh grouped review"]
    C --> D["Authoritative refetch"]
    D --> E["Atomic snapshot creation"]
    E --> F["Shared checklist detail"]
    F --> G["Optional practical amount"]
    G --> F
```

## Files changed

```text
.
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── database-erd.mmd
│   ├── database-schema.dbml
│   ├── project-plan.md
│   └── changelog/
│       └── 2026-08-22-0137-generate-grocery-lists-from-recipes.md
├── src/
│   ├── features/
│   │   ├── grocery-lists/
│   │   │   ├── GroceryListCard.tsx
│   │   │   ├── GroceryListDetail.tsx
│   │   │   ├── GroceryListGenerator.tsx
│   │   │   ├── GroceryListItemRow.tsx
│   │   │   ├── GroceryListItemSheet.tsx
│   │   │   ├── GroceryListLibrary.tsx
│   │   │   ├── GroceryListSourceDisclosure.tsx
│   │   │   ├── grocery-list.constants.ts
│   │   │   ├── grocery-list.errors.ts
│   │   │   ├── grocery-list.mappers.ts
│   │   │   ├── grocery-list.queries.ts
│   │   │   ├── grocery-list.repository.ts
│   │   │   ├── grocery-list.requirement-formatting.ts
│   │   │   ├── grocery-list.source-formatting.ts
│   │   │   ├── grocery-list.types.ts
│   │   │   ├── grocery-list.validation.ts
│   │   │   └── __tests__/
│   │   │       ├── GroceryListDetail.test.tsx
│   │   │       ├── GroceryListGenerator.test.tsx
│   │   │       ├── GroceryListItemRow.test.tsx
│   │   │       ├── GroceryListItemSheet.test.tsx
│   │   │       ├── GroceryListLibrary.test.tsx
│   │   │       ├── grocery-list.errors.test.ts
│   │   │       ├── grocery-list.mappers.test.ts
│   │   │       ├── grocery-list.queries.test.tsx
│   │   │       ├── grocery-list.repository.test.ts
│   │   │       └── grocery-list.validation.test.ts
│   │   └── recipes/
│   │       ├── recipe.queries.ts
│   │       └── __tests__/recipe.queries.test.tsx
│   └── lib/
│       ├── query/query-keys.ts
│       └── supabase/database.types.ts
├── supabase/
│   ├── migrations/20260822012421_add_grocery_recipe_snapshot_counts.sql
│   └── tests/grocery_lists.sql
└── tests/e2e/grocery-lists.spec.ts
```

## Verification

- Local Supabase reset passed.
- Supabase schema lint passed with no warnings.
- The expanded grocery-list SQL suite passed, including owner isolation, literal complete search, frozen counts, and an atomic rejection above ten recipes.
- TypeScript typecheck passed.
- ESLint passed.
- Vitest passed with 44 files and 373 tests.
- The selected-recipe grocery Playwright journey passed on the mobile Safari-size and desktop Chrome projects.

The local Supabase type generator remained unavailable because of its local authentication/container connection failure. The tracked database types were deliberately synchronized to the verified local schema instead of replacing the file with failed generator output.
