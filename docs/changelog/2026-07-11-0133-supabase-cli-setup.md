# Supabase CLI Setup

## Why

The local setup now relies on the Supabase CLI from the project dependency graph instead of assuming a global `supabase` command is available on every developer machine. The generated database types were refreshed after linking Supabase, and Supabase's local `.temp` workspace state is ignored so project-specific CLI metadata does not get committed. The auth setup docs were also clarified to include the planned Gmail SMTP sender mailbox and Google OAuth configuration path before application coding begins.

## File Manifest

- Modified `.gitignore`
- Modified `docs/ARCHITECTURE.md`
- Modified `docs/project-plan.md`
- Modified `package.json`
- Modified `package-lock.json`
- Modified `src/lib/supabase/database.types.ts`
- Created `docs/changelog/2026-07-11-0133-supabase-cli-setup.md`

## Local Structure

```text
.
├── .gitignore
├── docs
│   ├── ARCHITECTURE.md
│   ├── project-plan.md
│   └── changelog
│       └── 2026-07-11-0133-supabase-cli-setup.md
├── package-lock.json
├── package.json
├── src
│   └── lib
│       └── supabase
│           └── database.types.ts
└── supabase
    └── .temp/              # ignored local CLI state
```

## Diagram Updates

No architecture, entity relationship, or runtime flow diagrams changed for this setup-only slice.
