# Consolidate Recipe Form TODO Documentation

## What Changed

- Moved the remaining recipe form follow-up planning into `docs/project-plan.md`.
- Clarified that Supabase Storage image uploads are planned, while the current MVP still uses pasted image URLs.
- Preserved the pending dynamic cost-entry plan in the main roadmap.
- Updated the DTO boundary file list to match the current recipe feature modules.
- Corrected the architecture stack summary now that Google OAuth is implemented.
- Removed the standalone temporary recipe form TODO document now that its completed implementation notes live in changelogs and architecture docs.

## Why

The temporary TODO document mixed completed implementation notes with future planning. Keeping pending work in the project plan and completed details in changelogs/architecture makes the documentation easier to scan and prevents stale duplicate status from drifting.

## Changed Files

- Modified `docs/project-plan.md`.
- Modified `docs/ARCHITECTURE.md`.
- Created `docs/changelog/2026-07-13-1439-consolidate-form-todo-docs.md`.
- Deleted `docs/recipe-form-fixes-todo.md`.

## Localized Structure

```text
recipe-app/
└── docs/
    ├── ARCHITECTURE.md
    ├── project-plan.md
    ├── changelog/
    │   └── 2026-07-13-1439-consolidate-form-todo-docs.md
    └── recipe-form-fixes-todo.md (deleted)
```
