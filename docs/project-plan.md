# PocketPlates Project Plan

## Summary

Build PocketPlates, a multi-user, private-first, mobile-first Progressive Web App for students and beginner cooks who want practical recipes that are cheap, approachable, and realistic in small kitchens. The app should open from a URL, install cleanly to the iPhone Home Screen, and feel app-like without requiring App Store distribution.

The first release should stay intentionally small: save recipes, view them clearly, and find them again. Future phases should extend naturally into cost-aware filtering, beginner difficulty labels, meal planning, grocery lists, serving scaling, community recipe discovery, and nutrition/macros.

## Working Name

Recommended name: PocketPlates.

Why it fits:

- It sounds lightweight and student-friendly.
- It suggests affordable meals without making the product feel cheap or limiting.
- It still works if the app grows beyond personal storage into community recipe discovery.

Other possible names:

- BudgetBites: clearer about saving money, but more narrowly cost-focused.
- StarterPlate: strong beginner-cooking angle, but less flexible long term.
- UniPlates: student-specific, but may feel too tied to university life.
- PrepPocket: practical and meal-prep oriented, but slightly less natural as a brand.

Use PocketPlates as the planning name for now. The name can still change before the visual identity and domain are chosen.

## Audience And Positioning

Primary audience:

- Students, exchange students, and beginner cooks.
- People trying to save money while learning to cook.
- People with limited kitchen equipment, limited fridge/freezer space, or inconsistent schedules.

Product angle:

- A recipe app that answers, "Can I actually make this with my budget, skill level, and kitchen?"
- More practical than a polished recipe blog.
- More personal and searchable than scattered screenshots, bookmarks, or notes.
- Open signup at launch, where every user gets a private recipe library by default.
- Designed to support public/shared recipes later without exposing private user data.

## Confirmed Stack

- Frontend: Next.js with React and TypeScript.
- Styling: Tailwind CSS.
- Icons and visual placeholders: Lucide React icons with simple deterministic placeholder treatments.
- Backend platform: Supabase.
- Database: Supabase Postgres.
- Auth: Supabase Auth with email/password and Google OAuth.
- Storage: Supabase Storage for recipe images, with pasted image URLs allowed for the MVP.
- Deployment: Vercel.
- Source control: GitHub.
- CI/CD: GitHub Actions for checks, tests, type generation, and database migration deployment.
- Testing: Vitest for unit/integration tests and Playwright for end-to-end tests.
- Auth email: Supabase custom SMTP, initially using a dedicated Gmail or Google Workspace mailbox if acceptable for the project scale.
- Client server-state management: TanStack Query from the start, backed by typed Supabase repository functions.

## Recommended Supporting Libraries

- `lucide-react`: icons, empty states, and deterministic recipe placeholders.
- `@supabase/supabase-js`: Supabase client for Auth, Postgres, and Storage.
- `@supabase/ssr`: Supabase session handling across Next.js server/client boundaries.
- `react-hook-form`: ergonomic form state for add/edit recipe flows.
- `zod`: schema validation for form inputs, DTO boundaries, and repository inputs.
- `@tanstack/react-query`: server-state fetching, caching, mutations, optimistic updates, invalidation, loading states, and error states from the start.
- `next-pwa` or a maintained equivalent: PWA manifest/service-worker setup if the selected Next.js version still needs explicit PWA wiring.

## Architecture

The app has five main layers:

- Mobile PWA frontend hosted on Vercel.
- Supabase client integration inside the Next.js app.
- Supabase services for Auth, Postgres, Storage, and Row Level Security.
- GitHub Actions pipeline for checks, tests, type generation, and migration deployment.
- Supabase custom SMTP for production-ready auth emails, plus Google Cloud Console OAuth credentials for Google login.

Main runtime flow:

1. You open the app on iPhone from Safari or the Home Screen.
2. The Next.js UI loads from Vercel.
3. The app signs you up or signs you in through Supabase Auth.
4. Recipe data is read and written to Supabase Postgres.
5. Uploaded images are stored in Supabase Storage.
6. Row Level Security keeps each user's private recipes visible only to that user.

Architecture files:

- `docs/architecture.mmd`: editable Mermaid architecture source.
- `docs/assets/architecture.svg`: generated architecture image.
- `docs/database-erd.mmd`: editable Mermaid database ERD.
- `docs/database-schema.dbml`: DBML schema source for dbdiagram.io.
- `supabase/migrations/20260710000000_initial_recipe_schema.sql`: initial Supabase migration draft.

## Incremental Feature Roadmap

Build the app in stages. Each stage should leave the app usable, tested, and deployable.

### Stage 0: Foundation

Goal: create a deployable skeleton before building feature depth.

- Scaffold Next.js, React, TypeScript, Tailwind, Vitest, and Playwright.
- Add app shell, mobile layout, navigation, and placeholder screens.
- Add Supabase client setup and document the required `.env.local` values.
- Add TanStack Query provider, query key conventions, and repository-backed query/mutation hooks.
- Add CI checks for install, lint, type check, tests, and build.
- Add Vercel deployment configuration.

### Stage 1: True MVP - Private Recipe Library

Goal: any visitor can create an account, then save and retrieve their own private recipes.

- Email sign-up and sign-in through Supabase Auth.
- Google OAuth sign-in through Supabase Auth and Google Cloud Console credentials.
- Automatic profile creation after account signup.
- Recipe list with mobile-friendly cards.
- Recipe detail page.
- Add/edit recipe form.
- Required recipe fields: title, servings, one or more meal types, ingredients, and steps.
- Optional recipe fields: notes, one source URL, and image URL.
- Basic search by recipe title.
- Basic filter by meal types, allowing more than one meal type to be selected.
- Supabase persistence with Row Level Security.
- TanStack Query hooks for recipe list, recipe detail, create recipe, update recipe, and delete/archive recipe flows.
- Privacy guarantee: users can only read and change their own private library.

This is the first version worth calling "usable." Anything not listed here should wait unless it is needed to avoid rework.

### Stage 2: Student-Friendly Discovery Within Your Own Library

Goal: make saved recipes easier to choose when budget, effort, and equipment matter.

- Keep meal type filters from Stage 1 as a core browsing dimension: breakfast, lunch, dinner, snack, and flexible. These are multi-select because a recipe can belong to more than one meal.
- Add cost rating, such as very cheap, cheap, moderate, or splurge.
- Add one difficulty rating per recipe, such as easy, medium, hard, or beginner-friendly.
- Add effort/time filters, such as quick, make-ahead, one-pot, and low-cleanup.
- Add equipment filters, such as microwave, rice cooker, stovetop, oven, no oven, and blender.
- Add tags for student-oriented needs, such as budget, high protein, freezer-friendly, dorm-friendly, no-fridge, and meal prep.
- Search by ingredient name.
- Support multiple source links per recipe.
- Support uploaded images through Supabase Storage.

### Stage 3: Meal Prep Utilities

Goal: help users turn recipes into weekly cooking decisions.

- Weekly meal planning.
- Grocery list generated from selected recipes.
- Serving scaler.
- Pantry and staple-item tracking.
- Estimated cost per serving.
- Recipe duplication, archiving, and favorites.

### Stage 4: Community Recipe Discovery

Goal: let users discover recipes created by others while keeping private recipes safe.

- Public/shared recipe visibility controls.
- Public profile basics.
- Browse and search public recipes.
- Filter public recipes by cost, difficulty, equipment, meal types, tags, and ingredients.
- Save or fork another user's recipe into your private library.
- Report or hide inappropriate public recipes.
- Moderation/admin workflow if the audience grows beyond trusted users.

### Stage 5: Polish And Intelligence

Goal: improve quality, convenience, and personalization.

- Recipe import from pasted text or supported links.
- Nutrition/macros.
- Personalized recommendations.
- Better onboarding for beginner cooks.
- Collections, courses, or "cheap week" recipe packs.

## UI Plan

Primary screens:

- Home / Recipe Library: app header, search, multi-select meal-type quick filters, recipe cards, bottom navigation.
- Recipe Detail: image, title, meal types, servings, tags, source links, ingredients, steps, edit action.
- Add/Edit Recipe: title, servings, meal types, image upload or URL, links, ingredients, steps, notes, save/cancel actions.
- Filters Sheet: multi-select meal types, cost rating, single-select difficulty, effort/time tags, equipment, ingredient search, clear filters, done action.

Visual reference:

- `docs/assets/ui-mockups.svg`: generated mobile UI mockups.

Design direction:

- Mobile-first, dense enough for repeated daily use.
- Friendly to students and beginner cooks without feeling childish.
- More practical meal-decision tool than public recipe blog.
- Preserve the original recipe browsing filters such as breakfast, lunch, dinner, snack, and flexible.
- Recipe cards should stay compact and consistently show only the recipe title, cost rating, and difficulty.
- Prioritize cost, effort, equipment, storage, freezer-friendliness, and whether the recipe is realistic in a student kitchen.
- Use simple deterministic placeholders for recipes without images, such as Lucide icons, soft color blocks, initials, meal-type symbols, or tag-based patterns.
- Keep community discovery in mind, but do not let it complicate the first private-library MVP.

## Data Model

Core MVP tables:

- `profiles`: app profile for each Supabase Auth user, created automatically when a user signs up.
- `recipes`: main recipe record with owner, title, notes, servings, times, image, cost rating, single difficulty rating, and visibility.
- `recipe_meal_types`: recipe-to-meal-type join table so a recipe can be breakfast, lunch, dinner, snack, and/or flexible.
- `recipe_links`: source links for each recipe.
- `recipe_ingredients`: ordered ingredients.
- `recipe_steps`: ordered cooking steps.
- `tags`: reusable user-owned tags.
- `recipe_tags`: recipe-to-tag join table.
- `equipment`: reusable user-owned equipment labels.
- `recipe_equipment`: recipe-to-equipment join table.

Future-ready tables already represented in the draft schema:

- `pantry_items`: user pantry/cost reference.
- `meal_plans`: weekly meal planning.
- `meal_plan_entries`: scheduled recipes.
- `grocery_lists`: generated or manual grocery lists.
- `grocery_list_items`: grocery list line items.

Public discovery should build on the `recipes.visibility` and `recipes.published_at` fields rather than requiring a second recipe table. Private recipes stay visible only to their owner. Public recipes can be searched by other users once the community stage is implemented.

All user-owned data should be protected by Supabase Row Level Security. Policies should target the `authenticated` role explicitly and use owner checks based on `(select auth.uid())`. The initial policies should support many users, but only owner access. Public-read policies should only be introduced when the community discovery stage is being built.

## DTO Boundary

Keep database rows, DTOs, and UI state separate:

- Database rows match Supabase and Postgres naming, usually snake_case.
- DTOs are app-facing objects, usually camelCase.
- Form values are user-input objects and should not pretend to be complete database rows.

Recommended structure:

```txt
src/lib/supabase/client.ts
src/lib/supabase/database.types.ts
src/lib/query/query-client.ts
src/lib/query/query-keys.ts
src/features/recipes/recipe.types.ts
src/features/recipes/recipe.mappers.ts
src/features/recipes/recipe.repository.ts
src/features/recipes/recipe.queries.ts
src/features/recipes/recipe.service.ts
```

The repository talks to Supabase. The mapper converts rows into DTOs. TanStack Query hooks call repository functions and expose loading, error, cached data, and mutation states to the UI. Components should not make ad hoc server-state API calls in `useEffect`; `useEffect` should be reserved for true side effects such as focus management, subscriptions, or browser APIs. This keeps future migrations manageable because database changes are absorbed at the repository and mapper boundary.

## Delivery Environments

Use separate environments once the project moves beyond local-only development:

- Local: developer machine, local Next.js server, and local Supabase CLI stack.
- Preview: Vercel preview deployment for pull requests.
- Production: Vercel production deployment and production Supabase project.

If the app grows, add a staging Supabase project between preview and production. For the MVP, local plus production is enough, as long as database changes are migration-driven.

## Database And Migration Workflow

Database schema changes should go through migration files under `supabase/migrations`.

Recommended workflow:

1. Create or edit a migration locally.
2. Reset the local Supabase database to prove migrations apply from scratch.
3. Generate TypeScript database types from the current schema.
4. Run linting, type checks, unit tests, integration tests, and E2E tests.
5. Merge to `main`.
6. GitHub Actions applies migrations to the linked Supabase project.
7. Vercel deploys the app.

Avoid changing production tables manually in the Supabase dashboard once migrations are in use. Dashboard experiments should happen locally or be captured back into migration files before deployment.

## CI/CD Plan

Use GitHub Actions for repository checks and database safety:

- `ci.yml`: runs install, lint, type check, unit tests, integration tests, build, and Playwright E2E tests.
- `supabase-types.yml`: optionally checks that generated Supabase TypeScript types are up to date.
- `database-deploy.yml`: lists linked migrations, runs Supabase migrations on `main` after CI passes, then lists linked migrations again for audit visibility.

Use Vercel's GitHub integration for application deployment:

- Pull request: Vercel creates a preview deployment.
- Merge to `main`: Vercel creates a production deployment.

Required GitHub secrets later:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

Vercel will also need the public Supabase URL and publishable key as environment variables. Keep `SUPABASE_SECRET_KEY` server-only and use it only for future backend/admin operations that require elevated Supabase access.

## Testing Strategy

Use Vitest and Playwright. Do not use Jest and Cypress together for this project.

Recommended split:

- Unit tests: Vitest, for mappers, validation helpers, DTO conversion, utility functions, and pure components.
- Integration tests: Vitest, for repository functions, TanStack Query hooks, and Supabase-facing logic. These can run against mocked clients at first, then a local Supabase database later.
- E2E tests: Playwright, for core browser flows like sign in, recipe creation, recipe editing, filtering, and mobile viewport behavior.

This avoids the common Jest/Cypress issue where both tools inject global test types such as `describe`, `it`, and `expect`. Vitest and Playwright can also be kept in separate test folders with separate config files, so their types do not leak into each other.

Suggested layout:

```txt
src/
  features/
    recipes/
      recipe.mappers.ts
      recipe.repository.ts
      recipe.types.ts
      __tests__/
        recipe.mappers.test.ts
tests/
  e2e/
    recipe-library.spec.ts
```

Suggested config boundary:

- `vitest.config.ts` includes `src/**/*.test.ts` and `src/**/*.test.tsx`.
- `playwright.config.ts` includes `tests/e2e/**/*.spec.ts`.
- TypeScript config keeps app, Vitest, and Playwright types scoped instead of putting every test runner into the global app type space.

## Email Sending Plan

Supabase Auth can send emails for sign up, confirmation, magic links, invitations, password resets, and email changes.

Supabase provides a default email service for early testing, but it is intentionally restricted and not suitable for normal production use. Configure custom SMTP before depending on email auth outside local testing.

For a dedicated Gmail or Google Workspace mailbox:

- Turn on 2-Step Verification for the Google account.
- Create a Google app password for SMTP use.
- In Supabase, enable custom SMTP under Authentication settings.
- Use the Gmail SMTP host and the app password, not the normal Google account password.
- Set the sender email to the mailbox being used, such as `no-reply@your-domain.com` or the dedicated Gmail address.
- Test sign-up, password reset, and magic link delivery.

Typical Gmail SMTP values:

```txt
Host: smtp.gmail.com
Port: 587
User: your Gmail or Google Workspace email
Password: Google app password
Sender: same mailbox or verified sender
```

For a larger or more public app, prefer a transactional email provider such as Resend, Postmark, SendGrid, Brevo, or AWS SES instead of personal Gmail. Gmail is acceptable for low-volume personal use, but a transactional provider gives better deliverability controls, domain verification, and operational limits.

## Google OAuth Login Plan

Google login should be configured through Supabase Auth, with Google Cloud Console used only to create and manage the OAuth client credentials.

Before application coding starts:

- Create a dedicated PocketPlates email account for app ownership and support.
- Create or select a Google Cloud project for PocketPlates.
- In Google Cloud Console, open API and Services, configure the OAuth consent screen, then use Credentials > Create Credentials to create a web application OAuth client.
- Add `http://localhost:3000` as a development authorized JavaScript origin, and add the production domain after deployment.
- Add `https://<project-ref>.supabase.co/auth/v1/callback` as the hosted Supabase authorized redirect URI.
- Add `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI only when using local Supabase.
- Store the Google OAuth client ID and client secret in Supabase Authentication > Providers > Google, not in the repository.
- Enable the Google provider in Supabase.
- Add localhost and Vercel URLs to Supabase Auth redirect allow lists when those URLs are known.

Keep Google OAuth separate from Gmail SMTP: OAuth login uses a Google Cloud OAuth client secret; Gmail SMTP uses a mailbox app password.

## Future Enhancements

- Weekly meal prep planner.
- Grocery list generated from selected recipes.
- Serving scaler.
- Cost estimate per serving.
- Pantry tracking.
- Dorm/exchange filters.
- Icon-based recipe placeholders using Lucide React and meal/tag-based color treatments.
- Nutrition/macros.
- Recipe import from pasted text or supported links.

## Assumptions

- Use cloud sync from the start.
- Allow open account creation from the start.
- Keep recipes private by default until public recipe discovery is intentionally added.
- Do not use AI image generation for placeholders; use deterministic UI placeholders instead.
- Prioritize a useful personal meal-prep workflow over public recipe discovery.
