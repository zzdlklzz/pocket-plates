# Add Secret Safety Agent Rule

## Why

The project now explicitly requires agents to prevent API key and credential leaks. The new guidance clarifies that real secrets must never be printed, committed, logged, screenshotted, or copied into documentation, examples, tests, changelogs, comments, or user-facing responses.

The rule also documents placeholder usage, the browser/server environment boundary, redaction expectations, and the response to a suspected leak.

## File Manifest

- Modified `.codex/AGENTS.md`
- Created `docs/changelog/2026-07-10-2153-add-secret-safety-agent-rule.md`

## Visual Context & Structure

```txt
recipe-app/
  .codex/
    AGENTS.md
  docs/
    changelog/
      2026-07-10-2153-add-secret-safety-agent-rule.md
```

## Diagram Updates

No application flow, architecture, or entity relationship diagrams changed.
