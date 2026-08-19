# PocketPlates

This project folder contains the project plan, architecture diagrams, database schema, migration draft, and UI mockups for PocketPlates, a multi-user private-first mobile recipe app for students and beginner cooks who want practical, affordable meals.

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
- Images: private, owner-scoped Supabase Storage uploads
- Application CI: GitHub Actions using a version-matched Playwright container; deployments use Vercel Git integration and a separate Supabase migration workflow
- Testing: Vitest for unit/integration tests, Playwright for end-to-end tests
- Auth email: Supabase custom SMTP, initially via a dedicated Gmail or Google Workspace mailbox if suitable
- Device experience: Progressive Web App added to iPhone Home Screen

## MVP Goal

Create a multi-user private recipe library that works well on iPhone, lets anyone create an account, save recipes with ingredients, steps, servings, source links, and optional effort traits, and find active recipes by title, ingredient, or effort while leaving room for richer discovery, public recipes, meal planning, and grocery lists.

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
- `infra/aws/`: Terraform project for the low-cost AWS EC2 learning deployment
- `supabase/migrations/20260710000000_initial_recipe_schema.sql`: initial Supabase schema and RLS migration draft
- `supabase/migrations/20260819194346_add_private_library_search.sql`: owner-scoped title/ingredient search function and trigram indexes
- `supabase/migrations/20260819200746_grant_private_library_search_reads.sql`: authenticated source-table reads required by the security-invoker search function, still constrained by RLS
- `supabase/migrations/20260819203000_add_recipe_effort_labels.sql`: owner-scoped controlled effort metadata, atomic replacement, and match-all private-library filtering

## AWS Terraform Lab

Use `docs/aws-migration-learning-plan.md` as the AWS refresher. It tracks what is known to be complete, what must be verified manually in the AWS Console, and the minimal Terraform architecture to build first in `infra/test/`.

The repo also contains `infra/aws/`, a fuller Phase 5 Terraform reference implementation. Treat it as a future comparison point, not the beginner starting point. The beginner path is intentionally smaller: VPC, one public subnet, internet gateway, route table, security group, EC2, then IAM and CloudWatch when ready.

## MVP Screens

- Recipe library home screen
- Archived recipe management screen
- Recipe detail screen
- Add/edit recipe screen
- Filter sheet

## Future Features

- Image optimization and moderation before future public recipe sharing
- Equipment filters such as rice cooker, microwave, stovetop, and no oven
- Student-friendly tags such as budget, high-protein, freezer-friendly, and dorm-friendly
- Weekly meal prep planner
- Grocery list from selected recipes
- Optional total-cost entry and estimated cost per serving
- Pantry and staple tracking
- Favorites
- Public recipe discovery
- Recipe import from pasted text or supported links
- Nutrition/macros
- Personalized recommendations and beginner onboarding
- Collections and themed recipe packs
