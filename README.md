# PocketPlates

PocketPlates is a multi-user, private-first mobile recipe app for students and beginner cooks who want practical, affordable meals. The current app supports authenticated recipe management, optimized private images, combined library discovery, a low-friction weekly meal planner, private standalone grocery checklists, and grocery lists generated from saved recipes or a planned week. Week-generated lists can be explicitly refreshed in place after the plan changes.

## Recommended Stack

- Frontend: Next.js with React and TypeScript
- Styling: Tailwind CSS
- Icons/placeholders: Lucide React with deterministic recipe placeholders
- Forms/validation: React Hook Form and Zod
- Data fetching/cache: TanStack Query from the start, backed by Supabase repository functions
- Hosting: Vercel free/Hobby tier
- AWS learning deployment: Terraform-managed EC2, ECR, IAM, networking, and CloudWatch log groups, with Next.js standalone output enabled outside Vercel for the Docker migration path
- Backend: Supabase free tier
- Database: Supabase Postgres
- Auth: Supabase Auth
- Images: browser-optimized, owner-scoped private Supabase Storage uploads
- Application CI: GitHub Actions using a version-matched Playwright container; deployments use Vercel Git integration and a separate Supabase migration workflow
- Testing: Vitest for unit/integration tests, Playwright for end-to-end tests
- Auth email: Supabase custom SMTP, initially via a dedicated Gmail or Google Workspace mailbox if suitable
- Device experience: Progressive Web App added to iPhone Home Screen

## MVP Goal

Create a multi-user private recipe library that works well on iPhone, lets anyone create an account, save and find practical recipes, arrange them in a weekly meal plan, and maintain private grocery checklists generated manually or from recipes while leaving room for public recipes.

## Included Files

- `docs/ARCHITECTURE.md`: current app architecture, feature, and setup guide
- `docs/aws-migration-learning-plan.md`: AWS migration refresher, manual setup checklist, minimal learning architecture, and next steps
- `docs/project-plan.md`: consolidated MVP, stack, CI/CD, testing, email, migration, DTO, and UI plan
- `docs/architecture.mmd`: editable Mermaid architecture diagram source
- `docs/database-erd.mmd`: editable Mermaid database ERD source
- `docs/database-schema.dbml`: relational schema source for dbdiagram.io
- `docs/assets/architecture.svg`: generated current app architecture image
- `docs/assets/ui-mockups.svg`: generated mobile UI mockups
- `docs/assets/navigation-mockups.svg`: approved Home–Add–More navigation reference plus an unconfirmed future five-slot concept
- `docs/assets/meal-planner-mockups.svg`: approved weekly-list meal-planner layout and interaction-state reference
- `docs/assets/grocery-list-mockups.svg`: approved grocery-list library, grouped checklist, and simple week-refresh button reference
- `infra/aws/`: Terraform project for the low-cost AWS EC2 learning deployment
- `supabase/migrations/20260710000000_initial_recipe_schema.sql`: initial Supabase schema and RLS migration draft
- `supabase/migrations/20260819194346_add_private_library_search.sql`: owner-scoped title/ingredient search function and trigram indexes
- `supabase/migrations/20260819200746_grant_private_library_search_reads.sql`: authenticated source-table reads required by the security-invoker search function, still constrained by RLS
- `supabase/migrations/20260819203000_add_recipe_effort_labels.sql`: owner-scoped controlled effort metadata, atomic replacement, and match-all private-library filtering
- `supabase/migrations/20260819205000_add_equipment_presets.sql`: owner-scoped equipment presets, atomic effort/equipment replacement, match-all equipment filtering, and fresh-install recipe CRUD grants
- `supabase/migrations/20260821090000_prepare_meal_planner_foundation.sql`: authenticated meal-planner CRUD grants and uniqueness guarantees for one plan per owner/week and one exact recipe/slot entry
- `supabase/migrations/20260821230000_add_grocery_list_foundation.sql`: private manual and generated grocery snapshots, normalized product uniqueness, provenance rows, and atomic create/meal-plan-refresh functions
- `supabase/migrations/20260822012421_add_grocery_recipe_snapshot_counts.sql`: frozen selected-recipe counts, bounded recipe generation, and complete owner-scoped grocery recipe search
- `supabase/tests/equipment_presets.sql`: transactional local SQL checks for preset reuse, filter semantics, validation, and RLS
- `supabase/tests/meal_planner_foundation.sql`: transactional local SQL checks for planner grants, uniqueness, and owner isolation
- `supabase/tests/grocery_lists.sql`: transactional local SQL checks for grocery-list grants, isolation, generated snapshots, and refresh preservation rules
- `scripts/run-local-e2e.mjs`: isolated local-Supabase Playwright runner for signed-in mobile and desktop workflows

## Local Development

Use the repository migrations as the shared schema source of truth. With Docker running, start the app against local Supabase with:

```bash
npm run dev:local
```

This command starts the local Supabase stack when necessary, applies any pending local migrations without deleting existing local data, injects only the local public URL and publishable key into Next.js, and then starts the app. It intentionally overrides `.env.local` for that process, so localhost cannot accidentally read or write hosted recipe data.

Open `http://localhost:3000` and create a local account. Local users and recipe data remain separate from production. To rebuild the local database from every migration, use `npx supabase db reset --local`; this deletes local data only.

Run `npm run test:e2e:local` for the automated signed-in mobile and desktop workflows, including the complete meal-planner journey, standalone grocery-list editing, selected-recipe generation, and meal-plan snapshot refresh with preserved manual/check/override state. Grocery acceptance also checks keyboard focus return and the linked-list layout at 200% text scale. Both local commands apply pending migrations before starting, so newly committed migrations are picked up in future development sessions.

## AWS Terraform Lab

Use `docs/aws-migration-learning-plan.md` as the AWS refresher. It tracks what is known to be complete, what must be verified manually in the AWS Console, and the minimal Terraform architecture to build first in `infra/test/`.

The repo also contains `infra/aws/`, a fuller Phase 5 Terraform reference implementation. Treat it as a future comparison point, not the beginner starting point. The beginner path is intentionally smaller: VPC, one public subnet, internet gateway, route table, security group, EC2, then IAM and CloudWatch when ready.

## MVP Screens

- Recipe library home screen
- Archived recipe management screen
- Recipe detail screen
- Add/edit recipe screen
- Filter sheet
- Weekly meal planner with a seven-day vertical agenda, compact add/edit sheet with bounded title-or-ingredient recipe results, in-week day selection and one-serving defaults, in-app day/week copy and paste, and a grouped preparation summary linked to active recipes
- Grocery-list library, blank-list creation, private manual checklist editing, selected-recipe generation with serving adjustments, and whole-week generation with explicit in-place refresh

## Future Features

- Image moderation before future public recipe sharing
- Student-friendly tags such as budget, high-protein, freezer-friendly, and dorm-friendly
- Optional total-cost entry and estimated cost per serving
- Pantry and staple tracking
- Favorites
- Public recipe discovery
- Recipe import from pasted text or supported links
- Nutrition/macros
- Personalized recommendations and beginner onboarding
- Collections and themed recipe packs
