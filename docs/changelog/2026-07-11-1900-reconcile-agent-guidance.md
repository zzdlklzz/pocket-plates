# Reconcile Agent Guidance

## Why

The project had durable agent instructions in `.codex/AGENTS.md`, but that location can be missed or conflict with more specific workflows. The guidance has been split so repository-specific rules live at the project root, database-change requirements are explicit and discoverable, and the `.codex` copy no longer competes with the canonical file.

This keeps the user's engineering preferences intact: code should use OOP and reusable components where they clarify stable concepts, while still avoiding unnecessary abstractions and large unreviewed refactors.

Reusable review, commit-draft, and PR-draft rules were moved out of this repository into the global Codex rules folder so they can apply across projects.

The global `$simplify-codebase` skill was also tuned to preserve useful OOP, reusable components, and domain objects when they support extensibility.

## File Manifest

- Created `AGENTS.md`
- Modified `.gitignore`
- Replaced `.codex/AGENTS.md`
- Created `.codex/database-change-protocol.md`
- Deleted `.codex/rules/draft-commit.mdc`
- Deleted `.codex/rules/draft-pr.mdc`
- Deleted `.codex/rules/review-code.mdc`
- Created `/Users/dlkl/.codex/AGENTS.md`
- Created `/Users/dlkl/.codex/rules/draft-commit.mdc`
- Created `/Users/dlkl/.codex/rules/draft-pr.mdc`
- Created `/Users/dlkl/.codex/rules/review-code.mdc`
- Modified `/Users/dlkl/.codex/skills/simplify-codebase/SKILL.md`
- Modified `/Users/dlkl/.codex/skills/simplify-codebase/references/review-checklist.md`
- Created `docs/changelog/2026-07-11-1900-reconcile-agent-guidance.md`

## Localized Structure

```text
recipe-app/
  AGENTS.md
  .codex/
    AGENTS.md
    database-change-protocol.md
  docs/
    changelog/
      2026-07-11-1900-reconcile-agent-guidance.md
```

```text
~/.codex/
  AGENTS.md
  rules/
    default.rules
    draft-commit.mdc
    draft-pr.mdc
    review-code.mdc
  skills/
    simplify-codebase/
      SKILL.md
      references/
        review-checklist.md
```

## Diagram Updates

No application runtime flow, data model, or entity relationship changed.
