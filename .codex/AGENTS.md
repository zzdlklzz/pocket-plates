# AGENTS.md

## 1. Core Engineering & Architecture Principles
You must strictly adhere to these software engineering standards whenever writing or refactoring code:
- **OOP & DRY:** Respect Object-Oriented Programming (OOP) and Don't Repeat Yourself (DRY) principles. Code must be modular, highly reusable, and easily extendable.
- **No Magic Numbers:** All constant values, configuration keys, or magic strings must be extracted into meaningful, well-documented constant objects, enums, or configuration files.
- **Modern Standards (No Deprecations):** As far as possible, do not use deprecated features, APIs, methods, or legacy libraries. Always favor modern, standard, and actively supported alternatives to ensure long-term maintainability and security.
- **Simplicity First:** Always favor the simplest architecture and cleanest solution that satisfies the requirement. Do not over-engineer. Each class and file must have a single, clearly defined purpose; avoid creating unnecessary abstractions.
- **Type Safety & Compilation:** The codebase must compile cleanly at all times. All types, interfaces, and generic structures must be explicitly and clearly declared.
- **Comprehensive Testing:** Ensure that where appropriate, unit, integration, and end-to-end (E2E) tests are created. Maintain strong code coverage and explicitly test interactions and boundaries between components.

## 2. Project Organization & Clean Code
- Maintain a strict, predictable folder structure at all times. Group related components, services, or modules logically.
- Prioritize refactoring existing code over wrapping bad code if a change introduces duplication or violates good architectural design.

## 3. Scope Management & Iterative Approvals
- **Modular Changes ("Vertical Slices"):** Do not create massive, monolithic changes or giant commits. If an implementation will affect many files or structural layers, you must modularize the changes and break them down into small, logical slices.
- **Review Checkpoints:** Pause after completing each individual slice. Present the changes to the user for vetting and explicit approval before moving on to the next slice.
- **Staged Commit Messages:** Every time a change is made, stage the changes and draft the commit message according to `.codex/rules/draft-commit.mdc`. **Do not execute the actual commit command.** Wait for the user to review and approve both the code and the message.
- **Pull Request Drafts:** If asked to draft or create a pull request, follow `.codex/rules/draft-pr.mdc` for the PR title, summary, changes, testing, and notes.

## 4. Post-Change Action Protocol
Every single time you execute a task, make changes, or add a feature, you **must** perform the following three steps before marking your work as complete:

### Step A: Generate Chronological Change Log
Create a new Markdown file inside the `/docs/changelog` directory. 
- **Naming Convention:** Files must be named chronologically using the `YYYY-MM-DD-HHMM-description.md` format (e.g., `docs/changelog/2026-07-10-2035-add-auth-service.md`).
- **Contents Required:**
  - **The "Why":** A clear explanation of what changes were made and the underlying reasoning or technical context.
  - **File Manifest:** An explicit list of exactly which files were created, modified, or deleted.
  - **Visual Context & Structure:** A text-based representation of the localized project directory structure showing exactly where the new or modified files live.
  - **Diagram Updates:** If the code introduces new flows, architecture changes, or entity relationships, embed updated Mermaid.js class diagrams or sequence diagrams directly inside this change log.

### Step B: Update the Global Application Documentation
Maintain a single, authoritative master file for global documentation (currently `docs/ARCHITECTURE.md`). This file must be kept separate from individual change logs and must reflect the *current, total state* of the application:
- Document the entire system architecture, core application features, and business logic.
- Keep the master system-wide class diagrams, sequence diagrams, and architecture maps updated so they never fall out of sync with your changes.
- Ensure the documentation layout remains clean, highly organized, and scannable without becoming cluttered.

### Step C: Update the Step-by-Step Onboarding & Setup Guide
Maintain a bulletproof, exhaustive, step-by-step setup and installation guide within your main documentation. 
- **Codebase Setup:** If your changes introduce new dependencies, environment variables, or scripts, document the exact commands required (e.g., `npm install`, database migrations).
- **External/Infrastructure Setup:** Document all external configuration required outside of the codebase (e.g., detailed steps to provision a Supabase project, setting up OAuth providers, or creating bucket storage).
- **The New Developer Test:** Write this documentation with the explicit target that a developer with zero prior exposure to the application can pull the repository and perfectly stand up the app to its exact current state without hitting hidden roadblocks.
