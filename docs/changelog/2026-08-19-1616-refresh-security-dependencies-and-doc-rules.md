# Refresh Security Dependencies And Documentation Rules

## Why

The installed dependency lock contained high-severity advisories in the Next.js runtime chain and additional development-tool dependencies. The repository's documentation rules also did not explicitly require keeping the README's current screens and future-feature list consistent with the architecture guide and project plan, which allowed completed and declined work to remain stale.

## What changed

- Updated Next.js and its matching ESLint configuration from 16.2.10 to 16.3.1.
- Updated PostCSS from 8.5.17 to 8.5.26.
- Refreshed the lockfile to resolve Sharp 0.35.3, Nano ID 3.3.18, brace-expansion 1.1.18 and 5.0.9, JS-YAML 4.3.1, and Undici 7.29.0.
- Pinned Next.js Instant Insights validation to its documented `warning` default to avoid a 16.3.1 development-runtime undefined-config error without changing application behavior.
- Retained the Next.js-generated agent guidance and root-parameter type reference required by the upgraded framework tooling.
- Strengthened the repository agent instructions so every applicable change checks the README, architecture guide, and project plan before committing.
- Clarified that historical changelogs remain immutable records rather than being rewritten after later renames or status changes.
- Updated the README to show Archived Recipe Management as an implemented screen.
- Removed serving scaling and recipe duplication from current planning documentation while preserving Favorites as a separate planned feature.
- Recorded the completed security refresh in the project plan.

## File manifest

Created:

- `docs/changelog/2026-08-19-1616-refresh-security-dependencies-and-doc-rules.md`

Modified:

- `AGENTS.md`
- `README.md`
- `docs/project-plan.md`
- `next-env.d.ts`
- `next.config.mjs`
- `package-lock.json`
- `package.json`

Deleted:

- None.

## Localized structure

```text
.
├── AGENTS.md
├── README.md
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
└── docs/
    ├── project-plan.md
    └── changelog/
        └── 2026-08-19-1616-refresh-security-dependencies-and-doc-rules.md
```

No application flow, architecture, or entity relationship changed, so this dependency, framework-configuration, and documentation-policy slice does not require a Mermaid diagram.

## Verification

- `npm ci`: passed from the refreshed lockfile.
- `npm audit --audit-level=high`: passed with zero vulnerabilities at every severity.
- `npm run verify`: passed ESLint, TypeScript, and 14 Vitest files with 71 tests.
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`: passed.
- `npm run build`: passed with Next.js 16.3.1.
- `npm run test:e2e`: passed all 6 Playwright scenarios without the prior `validationLevel` browser error.
- `npm run docker:build`: not run because the local Docker daemon was unavailable.
