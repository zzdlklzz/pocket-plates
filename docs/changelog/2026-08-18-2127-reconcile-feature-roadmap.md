# Reconcile Feature Roadmap

## What Changed

Updated the PocketPlates documentation so the short README and detailed roadmap agree about which features are complete, planned, or intentionally dropped.

- Removed the planned iPhone form-input zoom fix.
- Removed the obsolete SMTP repair task because email signup is now working reliably.
- Clarified that future total-cost entry is optional and that leaving it blank must not block saving or derive a cost rating.
- Documented the current soft-archive behavior and the missing recovery experience.
- Added a planned Archived Recipes page and restore action while reserving permanent deletion for a separate, explicitly confirmed flow if it is ever introduced.
- Kept recipe importing provider-independent and planned around pasted text or supported links with a review step before saving.
- Replaced stale README future items, including already-completed difficulty ratings and deterministic placeholders, with the remaining roadmap.

## Why

The README still described completed work as future functionality, and the roadmap retained two tasks that are no longer needed. More importantly, the existing archive mutation preserves recipe data by setting `archived_at`, but active queries hide those rows and the app has no recovery UI. Recording the missing archive view and restore mutation makes the intended behavior explicit before implementation.

## Planned Archive Flow

```mermaid
flowchart LR
    active["Active recipe library"] -->|Archive| archived["Archived Recipes page"]
    archived -->|Restore| active
    archived -.->|Future delete with explicit confirmation| deleted["Permanently deleted"]
```

## Files Changed

Created:

- `docs/changelog/2026-08-18-2127-reconcile-feature-roadmap.md`

Modified:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/project-plan.md`

Deleted:

- None.

## Localized Directory Structure

```txt
recipe-app/
├── README.md
└── docs/
    ├── ARCHITECTURE.md
    ├── project-plan.md
    └── changelog/
        └── 2026-08-18-2127-reconcile-feature-roadmap.md
```

## Verification

- Compared README future features against the authoritative staged roadmap.
- Confirmed the archive repository mutation sets `archived_at` rather than deleting the recipe.
- Confirmed active recipe list and detail queries currently exclude archived rows.
- Reviewed the documentation diff for stale iPhone zoom and SMTP repair tasks, optional-cost wording, archive recovery requirements, and exact changed-file reporting.
- No application checks were run because this change only updates documentation.
