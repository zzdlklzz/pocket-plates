# Recipe Form Fixes Todo

This temporary planning file captures the requested fixes for the recipe creation and edit experience. The changes should be implemented in separate passes so each slice stays reviewable, testable, and easy to roll back. Mark each slice as done in this file when that slice is complete; after all slices are implemented and documented, delete this temporary file in a final cleanup pass.

## Current Context

The recipe write path currently lives mainly in:

- `src/features/recipes/recipe-form.tsx`
- `src/features/recipes/recipe.validation.ts`
- `src/features/recipes/recipe.types.ts`
- `src/features/recipes/recipe.repository.ts`
- `src/features/recipes/recipe.mappers.ts`
- `src/features/recipes/recipe.queries.ts`
- `src/features/recipes/__tests__/recipe.mappers.test.ts`

The current database schema already has some future-ready fields and tables:

- `recipes.image_url`
- `recipes.image_storage_path`
- `recipes.source_url`
- `recipe_links`
- `recipes.estimated_total_cost`
- `recipes.cost_rating`
- `recipe_meal_types`

Any implementation slice involving Supabase schema, migrations, RLS policies, storage buckets, generated database types, or database-facing repositories must first follow `.codex/database-change-protocol.md`.

## Priority Order And Status

- [x] Add stronger form validation and simplify ingredient inputs.
- [x] Improve save and load error feedback without exposing sensitive details.
- [x] Add consistent pending/loading feedback for slow actions and redirects.
- [x] Fix meal type filtering so flexible recipes appear in all meal type filters.
- [ ] Support multiple source URLs, up to a reasonable limit.
- [ ] Replace image URL entry with Supabase Storage image upload.
- [ ] Rework cost entry so cost rating can be generated from total SGD cost and servings.

## Completion Rules For Each Slice

When a slice is implemented:

- Mark the matching checkbox in this file as complete.
- Add the normal chronological changelog entry in `docs/changelog`.
- Update `docs/project-plan.md` if the slice completes or changes roadmap scope.
- Update `docs/ARCHITECTURE.md` for any changed user-facing behavior, data flow, setup step, or Supabase assumption.
- Write `docs/ARCHITECTURE.md` in a tutorial-friendly way so a future reader understands how to use the app, not only how the code is arranged.
- Run the narrowest meaningful verification for the slice and record it in the changelog.

## 1. Stronger Form Validation And Ingredient Simplification

### Goal

Prevent invalid recipe data from being accepted, especially ingredient amounts, servings, URLs, and repeated empty rows. Reduce unnecessary inputs if they make the form harder to use than the data is worth.

### Recommended UX

- Keep ingredient name required.
- Make ingredient amount optional, but when present it must be numeric or a supported simple fraction.
- Prefer an amount input that accepts values like `1`, `1.5`, `0.5`, `1/2`, and `1 1/2`.
- Replace free-text unit with a controlled unit picker if the app wants reliable filtering later.
- Include a short list of common units, such as `g`, `kg`, `ml`, `L`, `tsp`, `tbsp`, `cup`, `pcs`, `clove`, `slice`, `can`, `pack`, and `serving`.
- Allow `unit` to be blank for ingredients like "salt to taste".
- Keep ingredient notes in the form. They are useful for preparation details like "finely chopped", "optional", "divided", or "to taste".
- Remove the dedicated step timer field for now. Timing should be written naturally inside the step instruction text, such as "Simmer for 10 minutes."
- Keep servings as a positive whole number with a sensible max, such as 100.

### Code Changes

- Update `recipe.validation.ts`:
  - Add reusable validators for optional positive numbers and optional ingredient amount parsing.
  - Add a max length for text fields such as title, ingredient name, unit, notes, and step instruction.
  - Validate nested ingredient and step field errors at the row level.
  - Consider constants for limits, for example `MAX_INGREDIENTS`, `MAX_STEPS`, `MAX_SERVINGS`, and `MAX_TEXT_LENGTH`.
- Update `recipe-form.tsx`:
  - Use input types and attributes that match validation, such as `inputMode`, `min`, `max`, and `step`.
  - Show row-specific error messages under the exact ingredient or step field that failed.
  - Disable adding ingredient or step rows after the configured maximum.
  - If unit becomes a select, preserve a small escape hatch such as `other` only if the app needs it.
  - Remove the step timer input from the visible form.
- Update `recipe.repository.ts`:
  - Convert supported amount strings into numeric values before writing `recipe_ingredients.amount`.
  - Keep blank optional values as `null`.
  - Avoid writing `NaN` when a field is empty or invalid.
  - Stop writing `recipe_steps.timer_minutes` from the form, or keep it `null` until a future timer feature returns.
- Update `recipe.types.ts`:
  - Keep form values string-based where React Hook Form benefits from string inputs, but make parsed repository values explicit.
  - Remove `timerMinutes` from editable form values unless it must be kept temporarily for backward-compatible mapper defaults.
- Update tests:
  - Add validation tests for amount, servings, blank optional values, and invalid values.
  - Extend mapper tests if defaults or form value shapes change.

### Verification

- Run lint, typecheck, unit tests, and a targeted browser check of new and edit forms.
- Confirm invalid nested ingredient fields block submit and show useful inline errors.
- Confirm valid blank optional fields still save.
- Confirm existing recipes still show their step instructions after the timer input is removed.

## 2. Better Error Feedback

### Goal

Replace generic errors like "We could not save this recipe. Please try again." with helpful, safe feedback that tells the user what kind of issue occurred.

### Recommended UX

- Keep messages user-safe and non-sensitive.
- Show specific categories:
  - Not signed in: "Your session expired. Please sign in again."
  - Validation or bad input: "Some fields need fixing before this recipe can be saved."
  - Permission or RLS issue: "You do not have access to change this recipe."
  - Network issue: "Check your connection and try again."
  - Storage issue: "The image could not be uploaded. Try a smaller image or a different file."
  - Unknown issue: "We could not save this recipe. Please try again."
- Avoid showing raw Supabase messages that may include table names, policy names, internal codes, or implementation details.
- Consider showing an optional short support code only if the app later has logging.

### Code Changes

- Add a recipe error mapping module near the feature, for example `src/features/recipes/recipe.errors.ts`.
- Map known Supabase/PostgREST/auth/storage errors into safe UI messages.
- Keep repository functions throwing typed or classified errors where practical.
- Update `recipe-form.tsx`, `recipe-library.tsx`, `recipe-detail.tsx`, and archive flows to use the same safe message mapping.
- Consider logging the original error to the browser console only in development.

### Verification

- Add unit tests for error-to-message mapping.
- Manually verify create/update failures show the classified message while preserving generic fallback behavior.

## 3. Pending And Loading Feedback For Buttons

### Goal

Make slow actions feel acknowledged so users do not repeatedly click buttons while saves, archives, sign-outs, or redirects are in progress.

### Recommended UX

- Keep the existing `Saving...` submit text, but make it more visually obvious with a spinner icon or progress indicator.
- Disable all submit-related controls while the save mutation is pending.
- Add pending states for destructive or navigation-adjacent actions such as archive and sign out.
- For links that cause slow route transitions, consider a lightweight route pending indicator or use local pending state where possible.
- Avoid noisy toast spam. Prefer inline button loading states for direct actions; use toast-style feedback only for background operations or long-running image upload.

### Code Changes

- Add a small shared loading button pattern if multiple features need it.
- In `recipe-form.tsx`, disable save, add/remove ingredient, add/remove step, and meal type toggles while submitting if changing them mid-save would be confusing.
- Use `mutation.isPending` and route navigation state where available.
- In `recipe-detail.tsx`, add pending state to archive/delete actions.
- In auth components, make sure sign-out and auth submit buttons visibly show pending state.
- Consider a simple app-level pending route indicator only if button-level indicators are not enough.

### Verification

- Use browser testing with throttled network or a delayed local mutation to verify double clicks do not trigger duplicate saves.
- Confirm focus and disabled states remain accessible.

## 4. Flexible Meal Type Filter Semantics

### Goal

Treat `flexible` as "works for any meal type" during filtering, while still allowing it to be shown as a label on recipe cards.

### Recommended UX

- Keep "Flexible" as a meal type label on recipe cards and details.
- When filtering by Breakfast, Lunch, Dinner, or Snack, include recipes tagged with that exact meal type plus recipes tagged `flexible`.
- When filtering by Flexible specifically, show recipes tagged `flexible`.
- When multiple filters are selected, include recipes matching any selected meal type or `flexible`.

### Code Changes

- Update `recipe.repository.ts` in `listRecipes`:
  - When selected filters include non-flexible meal types, query `recipe_meal_types` for selected types plus `flexible`.
  - Avoid duplicate recipe IDs with the existing `Set` behavior.
  - Preserve current "All" behavior when no meal type filter is selected.
- Consider moving meal type matching rules into a small helper so tests can cover the semantics.
- Update `recipe-library.constants.ts` copy only if "Flexible" needs clearer wording later.

### Verification

- Add unit tests for the filter helper or repository behavior if the repository is testable with a mock.
- Manually confirm flexible recipes appear under Breakfast, Lunch, Dinner, and Snack filters.

## 5. Multiple Source URLs

### Goal

Support up to 5 source links per recipe so a recipe can reference variants, inspiration, or original posts.

### Recommended UX

- Replace the single Source URL field with a "Sources" section.
- Allow adding up to 5 links.
- Keep URL required only for rows the user adds.
- Optionally support a label/name per source, but defer it unless the detail page needs meaningful display text.
- Show each source as a separate link on recipe detail.

### Code Changes

- Read `.codex/database-change-protocol.md` before starting because this touches database-facing repository behavior and may require generated types.
- Prefer the existing `recipe_links` table instead of adding a new schema if it already covers the need.
- Update `recipe.types.ts`:
  - Replace `sourceUrl: string` with something like `sourceLinks: { url: string; label: string }[]`.
  - Keep backward compatibility in mappers if existing `recipes.source_url` data needs migration or display.
- Update `recipe.validation.ts`:
  - Add `sourceLinks` array validation.
  - Enforce max 5.
  - Enforce full `http` or `https` URLs.
  - Prevent duplicate URLs if desired.
- Update `recipe-form.tsx`:
  - Use `useFieldArray` for source links.
  - Add row-specific URL errors.
  - Disable "Add source" at 5 links.
- Update `recipe.repository.ts`:
  - Include `recipe_links` in detail select.
  - Replace source link child rows during create/update, similar to ingredients and steps.
  - Consider whether to continue writing `recipes.source_url` for compatibility or stop using it after a migration.
- Update `recipe.mappers.ts`:
  - Map sorted `recipe_links` rows into DTOs.
  - Convert legacy `source_url` into one source link if no child links exist.
- Update `recipe-detail.tsx`:
  - Render multiple source links.
- Update tests:
  - Mapper tests for multiple links, legacy fallback, sorting, and form defaults.

### Verification

- Run lint, typecheck, unit tests, build, and a manual create/edit/detail check.
- Verify 6th link cannot be added or submitted.
- Verify existing recipes with one `source_url` still display correctly.

## 6. Supabase Storage Image Upload

### Goal

Replace "Image URL" with image upload from the user's photos or files, storing the image in Supabase Storage with a reasonable size limit.

### Recommended UX

- Use a file input that accepts common image formats, such as JPEG, PNG, and WebP.
- Set a size limit, such as 5 MB.
- Show selected image preview before save.
- Allow removing or replacing the image.
- Show upload progress or at least a clear "Uploading..." / "Saving..." state.
- Keep images private to the owner unless a future public recipe feature needs public image access.

### Code And Architecture Changes

- Read `.codex/database-change-protocol.md` before starting because this involves Supabase Storage, database fields, policies, and generated types.
- Create or configure a Supabase Storage bucket, likely `recipe-images`.
- Add storage policies so users can upload, read, update, and delete only their own recipe images.
- Decide storage path convention, for example `{userId}/{recipeId}/{imageId}.webp`.
- Update database usage:
  - Store `image_storage_path` on `recipes`.
  - Use `image_url` only for derived public/signed display URLs if needed, or stop using it for user-entered URLs.
- Update `recipe.repository.ts` or add a storage service:
  - Upload file after recipe ID is known.
  - On create, insert recipe first, upload image, then update `image_storage_path`.
  - On update, upload replacement image and remove old image only after the new upload succeeds.
  - Decide cleanup behavior if child row writes fail after image upload.
- Update `recipe.queries.ts`:
  - Mutations may need to accept form values plus a `File`.
  - Invalidate recipe list/detail after upload and row update.
- Update `recipe.mappers.ts`:
  - Convert storage path to a display URL if signed URLs are used.
  - Consider signed URL expiration and cache behavior.
- Update `recipe-form.tsx`:
  - Replace URL input with file picker, preview, remove/replace controls, and size/type validation.
- Update `recipe-card.tsx` and `recipe-detail.tsx`:
  - Ensure they render uploaded image URLs or signed URLs.
- Update docs:
  - `docs/ARCHITECTURE.md`
  - `docs/project-plan.md`
  - Supabase setup instructions for the storage bucket and policies.

### Verification

- Run lint, typecheck, unit tests, build, and targeted browser testing.
- Validate storage policies with a second account or direct policy tests if available.
- Confirm oversized and unsupported image files are rejected before upload.
- Confirm replacing an image does not leave the recipe pointing at a deleted file.

## 7. Dynamic Cost Entry And Cost Rating

### Goal

Let users enter total meal prep cost in SGD, then compute cost per serving and derive the existing cost rating label dynamically.

### Recommended UX

- Replace manual cost rating selection with total cost input, likely labelled "Total cost (SGD)".
- Keep servings as the divisor.
- Show generated cost per serving immediately, for example "About S$2.50 per serving".
- Show the generated cost label, such as Very cheap, Cheap, Moderate, or Splurge.
- Allow blank total cost if the user does not know the price.

### Suggested Ranges

The exact thresholds should be confirmed before implementation. A reasonable starting point for student-friendly SGD meal prep:

- `very_cheap`: less than S$2.00 per serving.
- `cheap`: S$2.00 to S$3.99 per serving.
- `moderate`: S$4.00 to S$6.99 per serving.
- `splurge`: S$7.00 or more per serving.

### Code And Data Changes

- Read `.codex/database-change-protocol.md` before starting because this uses database fields and repository writes.
- Confirm whether `recipes.estimated_total_cost` can be used as-is.
- Keep `recipes.cost_rating` as a derived stored value if it is needed for efficient filtering.
- Add a single cost helper, for example `deriveCostRating(totalCost, servings)`, near recipe domain logic.
- Update `recipe.validation.ts`:
  - Add optional non-negative currency validation for total cost.
  - Limit decimal precision to two places.
- Update `recipe.types.ts`:
  - Add `estimatedTotalCost` to detail and form values.
  - Decide whether `costRating` remains in form values or becomes DTO-only.
- Update `recipe.repository.ts`:
  - Write `estimated_total_cost`.
  - Write derived `cost_rating`.
  - Avoid trusting client-only labels without running the helper in the repository boundary.
- Update `recipe.mappers.ts`:
  - Map `estimated_total_cost`.
  - Preserve existing `cost_rating` display for recipes without total cost.
- Update `recipe-form.tsx`:
  - Replace the cost select with total cost input and computed preview.
- Update `recipe-card.tsx`, filters, and detail:
  - Continue displaying the cost rating label.
  - Optionally show cost per serving where space allows.

### Verification

- Add unit tests for cost threshold boundaries and blank values.
- Run lint, typecheck, unit tests, build, and a browser check.
- Confirm changing servings updates the cost per serving preview and derived label.

## Suggested Implementation Slices

### Slice A: Validation And Form Feedback

- [x] Slice complete.

Implement priorities 1, 2, and 3 together only if the diff stays small. Otherwise split them into:

- [x] A1: validation and row-level errors.
- [x] A2: safe error messages.
- [x] A3: loading and pending states.

### Slice B: Meal Type Semantics

- [x] Slice complete.

Implement priority 4 separately because it is a focused repository/filtering behavior change.

### Slice C: Multiple Source Links

- [ ] Slice complete.

Implement priority 5 separately. It uses existing schema but changes DTOs, mappers, repository writes, form shape, detail display, and tests.

### Slice D: Image Upload

- [ ] Slice complete.

Implement priority 6 separately. This is the highest-risk slice because it includes storage bucket setup, policies, upload lifecycle, cleanup behavior, and UI preview states.

### Slice E: Cost Rework

- [ ] Slice complete.

Implement priority 7 separately. This touches data semantics and filters but can stay contained if it reuses `estimated_total_cost` and keeps `cost_rating` derived.

### Slice F: Remove This Temporary Todo

- [ ] Slice complete.

After every item above is complete and the permanent documentation is up to date, delete this file. The final cleanup should not remove any changelog or architecture documentation created by the individual slices.

## Open Questions Before Implementation

- Should ingredient units be a fixed picker, free text with validation, or a picker plus "other"?
- Should image uploads be private signed URLs or public bucket URLs?
- Should old pasted image URLs be migrated, preserved as legacy data, or ignored once uploads ship?
- Should multiple source links include labels, or are URLs enough for now?
- What SGD per-serving thresholds best match the intended cost labels?
