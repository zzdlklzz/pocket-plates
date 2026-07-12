# Recipe App Agent Guidance

These instructions apply to this repository. Keep changes small, verified, and easy for the next developer to understand.

## Engineering Standards

- Use simple, modular, extensible design. Prefer reusable components, services, and domain objects when they represent stable concepts, such as recipe cards, recipes, ingredients, auth profiles, or database entities.
- Respect OOP and DRY where they clarify ownership and reduce repeated business logic. Do not create abstractions only to satisfy a pattern; each class, module, component, and file must have a clear purpose.
- Extract magic numbers, repeated strings, config keys, table names, route paths, and policy names into meaningful constants or typed configuration when reuse or correctness depends on them.
- Use modern, supported APIs and libraries. Avoid deprecated features unless the surrounding code already requires them and the tradeoff is documented.
- Keep TypeScript explicit and type-safe. The app should compile cleanly after each coherent change.
- Add or update unit, integration, or end-to-end tests where the behavior, boundary, or risk justifies it.

## Project Organization

- Maintain predictable feature-oriented structure. Group related components, services, hooks, repositories, mappers, types, tests, and constants near the feature unless the code is genuinely shared.
- Prefer refactoring existing code over wrapping poor structure with additional layers.
- Reusable UI, such as recipe cards, should be componentized with clear props and stable boundaries.
- Shared utilities should be extracted only when multiple callers use the same rule or behavior. Avoid broad `utils`, `helpers`, or `misc` files for feature-specific logic.
- When simplifying or refactoring, prefer the `$simplify-codebase` skill for cleanup-specific workflow and safety checks.

## Secret And API Key Safety

- Never print, paste, commit, log, screenshot, or expose real API keys, database passwords, access tokens, JWT secrets, service role keys, OAuth client secrets, or production credentials.
- Use obvious placeholders in docs, tests, comments, examples, and changelogs, such as `sb_publishable_...`, `sb_secret_...`, `<your-project-ref>`, and `<your-secret-key>`.
- Never place server-only secrets in browser-exposed variables, especially variables prefixed with `NEXT_PUBLIC_`. Browser clients may only receive explicitly publishable keys.
- If inspecting environment files, terminal output, dashboards, logs, or diffs that may contain secrets, redact values before sharing them or writing them into repository files.
- If a secret appears exposed, stop using it, tell the user plainly, and recommend rotating or revoking the affected key before continuing related setup.

## Database Change Protocol

For every change involving Supabase, database schema, migrations, RLS policies, seed data, generated database types, storage buckets, auth provider setup, or database-facing repositories, read and follow `.codex/database-change-protocol.md` before marking the work complete.

Do not rewrite an already-applied migration unless the user confirms it is safe. Prefer a new forward migration for shared or production-like databases.

## Scope And Approval

- Work in small vertical slices. If a task affects many files or layers, complete one coherent slice, summarize it, and ask for approval before continuing to the next slice.
- Preserve user changes. Check the worktree before edits and do not revert unrelated changes.
- Do not create giant commits or broad rewrites. Keep unrelated concerns separate.
- Do not execute commits unless the user explicitly approves. Follow the global commit-draft guidance when preparing staged changes.
- If asked to draft or create a pull request, follow the global PR-draft guidance.

## Commit Message Drafts

- After every completed codebase change, include a detailed commit message draft in the final response unless the user explicitly says not to.
- Base the draft on the actual changed or staged diff, and follow the global Conventional Commits commit-draft rules.
- Keep the subject under 72 characters, then use the body to explain what changed and why when the change is more than a trivial single-purpose edit.
- Mention verification that was actually run. If checks were not run, say so outside the commit message and do not invent a testing footer or body line.
- If the working tree contains both staged and unstaged changes, clearly state which scope the draft covers and warn when the message would need to change after staging more files.

## Post-Change Documentation

After every code, database, configuration, dependency, or feature change, complete these steps before marking work done:

1. Create a chronological changelog in `docs/changelog` named `YYYY-MM-DD-HHMM-description.md`.
   - Explain what changed and why.
   - List exactly which files were created, modified, or deleted.
   - Include a localized directory structure showing where changed files live.
   - Add Mermaid diagrams when the change introduces or alters flows, architecture, or entity relationships.
2. Update `docs/ARCHITECTURE.md` when the current system architecture, features, business logic, data model, flows, or setup assumptions change.
3. Update setup/onboarding documentation when the change introduces dependencies, scripts, environment variables, migrations, Supabase setup, OAuth setup, storage buckets, or external infrastructure steps.
4. Update feature progress tracking in `docs/project-plan.md` for every implemented feature or slice. Mark completed items as done in the roadmap/checklist during the same change, and add any newly discovered follow-up slice as pending rather than leaving progress implied only by code or changelogs.

## Verification

- Run the narrowest meaningful verification after edits: typecheck, lint, unit tests, build, Playwright, migration validation, or targeted static checks.
- If verification cannot run, say why and name the remaining risk.
- Inspect the final diff before finishing to catch accidental churn, broken imports, leaked secrets, or stale documentation.
