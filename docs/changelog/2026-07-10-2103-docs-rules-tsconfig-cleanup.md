# Docs Rules And TypeScript Config Cleanup

## Why

This follow-up cleanup incorporates the user's documentation workflow refinements and fixes a TypeScript configuration warning. Changelogs now live under `docs/changelog/` to keep the top-level docs folder scannable, the global documentation file has been renamed from `docs/README.md` to `docs/ARCHITECTURE.md`, and `.codex/AGENTS.md` now requires concise but specific commit messages.

The TypeScript `baseUrl` option was removed because it is deprecated and will stop functioning in TypeScript 7.0. The path alias remains supported by changing the alias target from `src/*` to `./src/*`, preserving imports such as `@/lib/query/query-client` without adding `ignoreDeprecations`. Next.js continues to manage its generated `.next/types` include, and the final steady-state `npm run typecheck` passes cleanly.

## File Manifest

Created:

- `docs/changelog/2026-07-10-2103-docs-rules-tsconfig-cleanup.md`

Modified:

- `.codex/AGENTS.md`
- `.gitignore`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/changelog/2026-07-10-2046-tidy-foundation-docs.md`
- `tsconfig.json`

Moved:

- `docs/README.md` to `docs/ARCHITECTURE.md`
- `docs/2026-07-10-2046-tidy-foundation-docs.md` to `docs/changelog/2026-07-10-2046-tidy-foundation-docs.md`

Deleted:

- None.

## Local Structure

```txt
.codex/
  AGENTS.md
docs/
  ARCHITECTURE.md
  changelog/
    2026-07-10-2046-tidy-foundation-docs.md
    2026-07-10-2103-docs-rules-tsconfig-cleanup.md
tsconfig.json
```

## Diagram Updates

No runtime architecture or entity relationships changed in this slice. The change is documentation organization and TypeScript compiler configuration only.
