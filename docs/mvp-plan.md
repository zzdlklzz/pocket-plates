# Mobile Recipe PWA MVP Plan

## Summary

Build a mobile-first Progressive Web App that can be opened from a URL and added to the iPhone Home Screen. This avoids App Store fees while still feeling app-like for personal daily use.

Recommended stack:

- Frontend: Next.js + TypeScript + Tailwind CSS
- Hosting: Vercel free/Hobby tier
- Backend: Supabase free tier
- Database: Supabase Postgres
- Auth: Supabase Auth
- Images: Supabase Storage or pasted image URLs
- Privacy: private app, only your signed-in account can access recipes

## Architecture

The app has three main layers:

- Mobile PWA frontend hosted on Vercel
- Supabase client integration inside the app
- Supabase services for auth, database, and image storage

Main flow:

1. You open the app on iPhone from Safari or the Home Screen.
2. The Next.js UI loads from Vercel.
3. The app signs you in through Supabase Auth.
4. Recipe data is read and written to Supabase Postgres.
5. Uploaded images are stored in Supabase Storage.
6. Row Level Security keeps recipes private to your account.

See `architecture.svg` for the visual diagram and `architecture.mmd` for the editable Mermaid source.

## MVP Features

- Private sign-in.
- Recipe grid/list with mobile-friendly cards.
- Recipe detail page.
- Add/edit recipe form.
- Multiple optional source links per recipe.
- Ingredients with name, amount, unit, and notes.
- Ordered cooking steps.
- Servings count.
- Meal type: breakfast, lunch, dinner, snack, flexible.
- Tags for filtering, such as budget, quick, high protein, freezer-friendly.
- Recipe image from upload or pasted URL.
- Polished placeholder when no image exists.
- Search by recipe title or ingredient.
- Filter by meal type and tags.

## Data Model

Use Supabase tables:

- `recipes`: title, notes, servings, meal type, image URL/path, owner user ID
- `recipe_links`: recipe ID, label, URL
- `ingredients`: recipe ID, name, amount, unit, notes, sort order
- `steps`: recipe ID, instruction text, sort order
- `recipe_tags`: recipe ID, tag value

All tables should include an owner or recipe relationship that supports Supabase Row Level Security.

## UI Plan

Main screens:

- Home / Recipe Library: search, quick filters, recipe cards, bottom navigation.
- Recipe Detail: image, title, servings, tags, links, ingredients, steps, edit action.
- Add/Edit Recipe: fields for title, servings, meal type, image, source links, ingredients, and steps.
- Filters Sheet: meal type, tags, ingredient search, clear filters.

See `ui-mockups.svg` for the visual mockup.

## Differentiation

Make this less like a public recipe browser and more like a personal exchange meal-prep companion:

- Prioritize whether a recipe is realistic overseas.
- Add future filters for equipment: microwave, rice cooker, stovetop, no oven.
- Add future tags for cheap, one-pot, dorm-friendly, no-fridge, freezer-friendly.
- Support practical personal notes instead of polished recipe-blog formatting.
- Generate future grocery lists from selected recipes.

## Future Enhancements

- Weekly meal prep planner.
- Grocery list generated from selected recipes.
- Serving scaler.
- Cost estimate per serving.
- Equipment filters.
- Dorm/exchange filters.
- AI-generated placeholder images.
- Nutrition/macros.
- Recipe import from pasted text or supported links.

## Test Plan

- Sign in and confirm recipes are private.
- Add, edit, and delete recipes on desktop and iPhone.
- Add multiple source links to one recipe.
- Add ingredients and steps, then confirm ordering is preserved.
- Upload or paste an image and confirm it appears on the card and detail page.
- Test mobile layout on iPhone-sized screens.
- Test search and filters.
- Deploy to Vercel and test Add to Home Screen on iPhone Safari.

## Assumptions

- Use cloud sync from the start.
- Keep the app private for one user initially.
- Skip AI image generation in the MVP to avoid paid API costs.
- Prioritize a useful personal meal-prep workflow over public recipe discovery.

