# Database Change Protocol

Use this checklist for every Supabase or database-related change in this repository.

## Before Editing

- Identify whether the change touches schema, migrations, RLS policies, seed data, storage buckets, auth configuration, generated types, database repositories, query hooks, or setup documentation.
- Check whether the affected migration may already be applied to a shared database. If yes or uncertain, create a new forward migration instead of rewriting history.
- Review existing schema documentation: `docs/ARCHITECTURE.md`, `docs/database-schema.dbml`, `docs/database-erd.mmd`, and relevant changelogs.

## Required Implementation Checks

- Keep table names, column names, policy names, and relationship names consistent across migrations, generated types, repositories, docs, and diagrams.
- For RLS changes, verify the intended user boundary for select, insert, update, and delete paths.
- For auth or OAuth changes, preserve the boundary between public browser config and server-only secrets.
- For repository/query changes, keep data mapping explicit and type-safe.
- For schema changes, update local TypeScript types or document why type generation could not be run.

## Required Documentation Updates

After the database change, update all affected files:

- `docs/changelog/YYYY-MM-DD-HHMM-description.md` with the why, file manifest, localized structure, and diagrams when relevant.
- `docs/ARCHITECTURE.md` for current data model, business rules, flows, RLS assumptions, and setup implications.
- `docs/database-schema.dbml` when entities, columns, relationships, constraints, or indexes change.
- `docs/database-erd.mmd` when entities or relationships change.
- Setup/onboarding docs when migrations, Supabase project setup, OAuth providers, storage buckets, environment variables, or commands change.

## Verification

- Run the narrowest available checks, such as typecheck, tests, Supabase migration validation, schema diff, or static references.
- Inspect the diff for leaked secrets, stale docs, missing diagrams, and mismatches between SQL, types, and documentation.
- If a check cannot run because credentials, network, Docker, or Supabase CLI access is unavailable, state that clearly in the final response.
