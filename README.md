# PocketPlates

This project folder contains the project plan, architecture diagrams, database schema, migration draft, and UI mockups for PocketPlates, a multi-user private-first mobile recipe app for students and beginner cooks who want practical, affordable meals.

## Recommended Stack

- Frontend: Next.js with React and TypeScript
- Styling: Tailwind CSS
- Icons/placeholders: Lucide React with deterministic recipe placeholders
- Forms/validation: React Hook Form and Zod
- Data fetching/cache: TanStack Query from the start, backed by Supabase repository functions
- Hosting: Vercel free/Hobby tier
- Backend: Supabase free tier
- Database: Supabase Postgres
- Auth: Supabase Auth
- Images: Supabase Storage or pasted image URLs
- CI/CD: GitHub Actions and Vercel Git deployments
- Testing: Vitest for unit/integration tests, Playwright for end-to-end tests
- Auth email: Supabase custom SMTP, initially via a dedicated Gmail or Google Workspace mailbox if suitable
- Device experience: Progressive Web App added to iPhone Home Screen

## MVP Goal

Create a multi-user private recipe library that works well on iPhone, lets anyone create an account and save recipes with ingredients, steps, servings, and source links, and leaves room for cost-aware filters, beginner-friendly discovery, public recipes, meal planning, and grocery lists.

## Included Files

- `docs/ARCHITECTURE.md`: current app architecture, feature, and setup guide
- `docs/project-plan.md`: consolidated MVP, stack, CI/CD, testing, email, migration, DTO, and UI plan
- `docs/architecture.mmd`: editable Mermaid architecture diagram source
- `docs/database-erd.mmd`: editable Mermaid database ERD source
- `docs/database-schema.dbml`: relational schema source for dbdiagram.io
- `docs/assets/architecture.svg`: generated architecture diagram image
- `docs/assets/ui-mockups.svg`: generated mobile UI mockups
- `supabase/migrations/20260710000000_initial_recipe_schema.sql`: initial Supabase schema and RLS migration draft

## MVP Screens

- Recipe library home screen
- Recipe detail screen
- Add/edit recipe screen
- Filter sheet

## Future Features

- Weekly meal prep planner
- Grocery list from selected recipes
- Serving scaler
- Cost estimate per serving
- Beginner difficulty ratings
- Public recipe discovery
- Equipment filters such as rice cooker, microwave, stovetop, no oven
- Exchange-friendly tags such as cheap, one-pot, freezer-friendly, dorm-friendly
- Icon-based recipe placeholders
- Nutrition/macros
