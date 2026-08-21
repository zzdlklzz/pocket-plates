import { expect, test, type Page } from "@playwright/test";

test.skip(
  !process.env.E2E_LOCAL_SUPABASE,
  "Authenticated grocery-list tests require the local Supabase runner."
);

type RecipeIngredient = {
  amount?: string;
  name: string;
  note?: string;
  unit?: string;
};

function addIsoDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

async function createAccount(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("local-test-password");
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();

  await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
}

async function createRecipe(
  page: Page,
  title: string,
  servings: string,
  ingredients: RecipeIngredient[]
) {
  await page.getByRole("link", { name: "Add recipe" }).click();
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("spinbutton", { name: "Servings" }).fill(servings);

  for (const [index, ingredient] of ingredients.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Add ingredient" }).click();
    }

    await page.getByRole("textbox", { name: "Ingredient", exact: true }).fill(
      ingredient.name
    );
    if (ingredient.amount) {
      await page.getByRole("textbox", { name: "Amount", exact: true }).fill(
        ingredient.amount
      );
    }
    if (ingredient.unit) {
      await page.getByRole("combobox", { name: "Unit", exact: true }).selectOption(
        ingredient.unit
      );
    }
    if (ingredient.note) {
      await page
        .getByRole("textbox", { name: "Preparation note" })
        .fill(ingredient.note);
    }
  }

  await page
    .getByRole("textbox", { name: "Instruction", exact: true })
    .fill("Combine, cook, and serve.");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function addMealToWeek(
  page: Page,
  weekStartDate: string,
  recipeTitle: string,
  dayOffset: number,
  servings: string
) {
  await page.getByRole("button", { name: /^Add meal to / }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add meal" });
  await dialog
    .getByRole("combobox", { name: "Day" })
    .selectOption(addIsoDays(weekStartDate, dayOffset));
  await dialog.getByRole("searchbox", { name: "Search recipes" }).fill(recipeTitle);
  await dialog
    .getByRole("region", { name: "Recipe search results" })
    .getByRole("button", { name: `Select ${recipeTitle}` })
    .click();
  await dialog
    .getByRole("spinbutton", { name: "Planned servings" })
    .fill(servings);
  await dialog.getByRole("button", { name: /^Add to / }).click();
  await expect(dialog).not.toBeVisible();
}

test("manages a standalone grocery list across reloads", async ({
  page
}, testInfo) => {
  const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `grocery-lists-${uniqueSuffix}@example.test`;
  const initialTitle = `Weekend shop ${uniqueSuffix}`;
  const renamedTitle = `Weekly shop ${uniqueSuffix}`;
  const initialItem = `Spinach ${uniqueSuffix}`;
  const editedItem = `Baby spinach ${uniqueSuffix}`;

  await createAccount(page, email);
  await page.goto("/grocery-lists");
  await expect(
    page.getByRole("heading", { name: "Grocery lists", exact: true })
  ).toBeVisible();

  await page.getByRole("link", { name: "New blank list" }).first().click();
  await page.getByRole("textbox", { name: "List title" }).fill(initialTitle);
  await page.getByRole("button", { name: "Create grocery list" }).click();

  await expect(page.getByRole("heading", { name: initialTitle })).toBeVisible();
  await expect(page.getByText("Manual list", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh from week/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Add item" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add item" });
  await addDialog.getByRole("textbox", { name: "Item" }).fill(initialItem);
  await addDialog.getByRole("textbox", { name: "Amount" }).fill("2");
  await addDialog.getByRole("textbox", { name: "Unit" }).fill("bags");
  await addDialog.getByRole("textbox", { name: "Note" }).fill("For dinner");
  await addDialog.getByRole("button", { name: "Add item", exact: true }).click();

  await expect(page.getByRole("button", { name: `Edit ${initialItem}` })).toBeVisible();
  await expect(page.getByText("2 bags", { exact: true })).toBeVisible();
  await expect(page.getByText("For dinner", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${initialItem}` }).click();
  const editDialog = page.getByRole("dialog", { name: `Edit ${initialItem}` });
  await editDialog.getByRole("textbox", { name: "Item" }).fill(editedItem);
  await editDialog.getByRole("textbox", { name: "Amount" }).fill("3");
  await editDialog.getByRole("textbox", { name: "Unit" }).fill("bunches");
  await editDialog.getByRole("textbox", { name: "Note" }).fill("For lunches");
  await editDialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("button", { name: `Edit ${editedItem}` })).toBeVisible();
  await expect(page.getByText("3 bunches", { exact: true })).toBeVisible();
  await expect(page.getByText("For lunches", { exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: `Mark ${editedItem} as bought` }).click();
  await expect(page.getByText("1 of 1 items checked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completed (1)" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Edit ${editedItem}` })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("1 of 1 items checked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Edit ${editedItem}` })).toHaveCount(0);
  await page.getByRole("button", { name: "Completed (1)" }).click();
  await page
    .getByRole("checkbox", { name: `Mark ${editedItem} as not bought` })
    .click();
  await expect(page.getByText("0 of 1 items checked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Edit ${editedItem}` })).toBeVisible();

  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("button", { name: "Rename list" }).click();
  const renameDialog = page.getByRole("dialog", { name: "Rename grocery list" });
  await renameDialog.getByRole("textbox", { name: "List title" }).fill(renamedTitle);
  await renameDialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: renamedTitle })).toBeVisible();

  await page.getByRole("link", { name: "Grocery lists" }).first().click();
  const listCard = page.getByRole("link", {
    name: `Open ${renamedTitle}, 0 of 1 checked`
  });
  await expect(listCard).toBeVisible();
  await expect(listCard).toContainText("Manual");
  await expect(listCard).toContainText("0 of 1 checked · Updated today");

  await page.reload();
  await expect(listCard).toBeVisible();
  await listCard.click();
  await expect(page.getByRole("heading", { name: renamedTitle })).toBeVisible();
  await expect(page.getByRole("button", { name: `Edit ${editedItem}` })).toBeVisible();
  await expect(page.getByText("3 bunches", { exact: true })).toBeVisible();
  await expect(page.getByText("For lunches", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh from week/ })).toHaveCount(0);

  await page.getByRole("button", { name: "List actions" }).click();
  await page.getByRole("button", { name: "Delete list" }).click();
  const deleteDialog = page.getByRole("alertdialog", {
    name: `Delete “${renamedTitle}”?`
  });
  await expect(deleteDialog).toContainText("This action cannot be undone.");
  await deleteDialog.getByRole("button", { name: "Delete list" }).click();

  await expect(page).toHaveURL(/\/grocery-lists$/);
  await expect(
    page.getByRole("heading", { name: "Grocery lists", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Open ${renamedTitle}, 0 of 1 checked` })
  ).toHaveCount(0);
});

test("generates one durable list from grouped recipe ingredients", async ({
  page
}, testInfo) => {
  const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `grocery-recipes-${uniqueSuffix}@example.test`;
  const firstRecipeTitle = `Pepper noodles ${uniqueSuffix}`;
  const secondRecipeTitle = `Pepper rice ${uniqueSuffix}`;
  const groceryListTitle = `Pepper shop ${uniqueSuffix}`;

  await createAccount(page, email);
  await createRecipe(page, firstRecipeTitle, "4", [
    { amount: "1", name: "Pepper", note: "ground", unit: "tbsp" }
  ]);
  const firstRecipeUrl = page.url();

  await page.getByRole("link", { name: "Library" }).click();
  await createRecipe(page, secondRecipeTitle, "2", [
    { amount: "2", name: "  PEPPER  ", note: "cracked", unit: "tbsp" },
    { amount: "1", name: "pepper", note: "fine", unit: "tsp" },
    { name: "Pepper", note: "whole" }
  ]);

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog", { name: "More" })
    .getByRole("link", { name: "Grocery lists" })
    .click();
  await page.getByRole("link", { name: "Generate from recipes" }).first().click();

  await expect(
    page.getByRole("heading", { name: "Generate from recipes" })
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search recipes" });
  const searchResults = page.getByLabel("Recipe search results");

  await search.fill(firstRecipeTitle);
  await searchResults
    .getByRole("button", { name: new RegExp(firstRecipeTitle) })
    .click();
  await search.fill(firstRecipeTitle);
  await expect(
    searchResults.getByRole("button", { name: new RegExp(firstRecipeTitle) })
  ).toBeDisabled();
  await search.fill("pepper");
  await searchResults
    .getByRole("button", { name: new RegExp(secondRecipeTitle) })
    .click();

  await expect(search).toBeFocused();
  const firstTargetServings = page.getByRole("spinbutton", {
    name: `Target servings for ${firstRecipeTitle}`
  });
  const secondTargetServings = page.getByRole("spinbutton", {
    name: `Target servings for ${secondRecipeTitle}`
  });
  await firstTargetServings.fill("8");
  await expect(firstTargetServings).toHaveValue("8");
  await secondTargetServings.fill("4");
  await expect(secondTargetServings).toHaveValue("4");
  await page.getByRole("textbox", { name: "List title" }).fill(groceryListTitle);
  await page.getByRole("button", { name: "Review items" }).click();

  const previewHeading = page.getByRole("heading", { name: "Shopping items" });
  await expect(previewHeading).toBeVisible();
  const preview = previewHeading.locator("../..");
  await expect(preview.locator(":scope > ul > li")).toHaveCount(1);
  await expect(preview.getByText("Pepper", { exact: true })).toBeVisible();
  await expect(
    preview.getByText("6 tbsp total + 2 tsp + 1 more", { exact: true })
  ).toBeVisible();
  await expect(preview.getByText("Used in 2 recipes", { exact: true })).toBeVisible();

  await preview.getByText("Recipe requirements", { exact: true }).click();
  const requirementGroups = preview.locator("details ul").first();
  await expect(requirementGroups.getByText("6 tbsp total", { exact: true })).toBeVisible();
  await expect(requirementGroups.getByText("2 tsp", { exact: true })).toBeVisible();
  await expect(requirementGroups.getByText("extra", { exact: true })).toBeVisible();
  await expect(preview.getByText(`${firstRecipeTitle} · ground`)).toBeVisible();
  await expect(preview.getByText(`${secondRecipeTitle} · cracked`)).toBeVisible();
  await expect(preview.getByText(`${secondRecipeTitle} · fine`)).toBeVisible();
  await expect(preview.getByText(`${secondRecipeTitle} · whole`)).toBeVisible();
  await expect(preview.getByText("No quantity", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create grocery list" }).click();
  await expect(page.getByRole("heading", { name: groceryListTitle })).toBeVisible();
  const groceryListUrl = page.url();
  await expect(
    page
      .getByRole("heading", { name: groceryListTitle })
      .locator("..")
      .getByText("2 recipes", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("Used in 2 recipes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh from week/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Pepper" }).click();
  let editDialog = page.getByRole("dialog", { name: "Edit Pepper" });
  await editDialog
    .getByRole("button", { name: "Set a practical shopping amount" })
    .click();
  await editDialog.getByRole("textbox", { name: "Amount" }).fill("1");
  await editDialog.getByRole("textbox", { name: "Unit" }).fill("jar");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("1 jar", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit Pepper" }).click();
  editDialog = page.getByRole("dialog", { name: "Edit Pepper" });
  await editDialog.getByRole("button", { name: "Use recipe requirements" }).click();
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("6 tbsp total + 2 tsp + 1 more", { exact: true })
  ).toBeVisible();

  await page.getByText("Recipe requirements", { exact: true }).click();
  await expect(page.getByText(`${firstRecipeTitle} · ground`)).toBeVisible();
  await expect(page.getByText(`${secondRecipeTitle} · whole`)).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("6 tbsp total + 2 tsp + 1 more", { exact: true })
  ).toBeVisible();
  await page.getByText("Recipe requirements", { exact: true }).click();
  await expect(page.getByText(`${firstRecipeTitle} · ground`)).toBeVisible();
  await expect(page.getByText(`${secondRecipeTitle} · whole`)).toBeVisible();

  await page.goto(firstRecipeUrl);
  await page.getByRole("button", { name: "Archive recipe" }).click();
  await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
  await page.goto(groceryListUrl);
  await expect(page.getByRole("heading", { name: groceryListTitle })).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: groceryListTitle })
      .locator("..")
      .getByText("2 recipes", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh from week/ })).toHaveCount(0);
  await page.getByText("Recipe requirements", { exact: true }).click();
  await expect(page.getByText(`${firstRecipeTitle} · ground`)).toBeVisible();
});

test("refreshes a meal-plan grocery snapshot while preserving shopping state", async ({
  page
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `grocery-week-${uniqueSuffix}@example.test`;
  const repeatedRecipeTitle = `Pepper bowls ${uniqueSuffix}`;
  const removedRecipeTitle = `Pepper rice ${uniqueSuffix}`;
  const addedRecipeTitle = `Carrot salad ${uniqueSuffix}`;
  const manualItem = `Milk ${uniqueSuffix}`;
  const groceryListTitle = `Week shop ${uniqueSuffix}`;

  await createAccount(page, email);
  await createRecipe(page, repeatedRecipeTitle, "4", [
    { amount: "1", name: "Pepper", note: "ground", unit: "tbsp" }
  ]);
  await page.getByRole("link", { name: "Library" }).click();
  await createRecipe(page, removedRecipeTitle, "2", [
    { amount: "1", name: "PEPPER", note: "cracked", unit: "tsp" },
    { amount: "1", name: "Rice", unit: "cup" }
  ]);
  await page.getByRole("link", { name: "Library" }).click();
  await createRecipe(page, addedRecipeTitle, "3", [
    { amount: "2", name: "Carrots", unit: "pcs" }
  ]);

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog", { name: "More" })
    .getByRole("link", { name: "Meal planner" })
    .click();
  await page.getByRole("button", { name: "This week" }).click();
  const weekStartDate = new URL(page.url()).searchParams.get("week");
  expect(weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await addMealToWeek(page, weekStartDate!, repeatedRecipeTitle, 0, "2");
  await addMealToWeek(page, weekStartDate!, repeatedRecipeTitle, 1, "6");
  await addMealToWeek(page, weekStartDate!, removedRecipeTitle, 2, "2");

  await page.getByRole("link", { name: "Grocery list" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/grocery-lists/new\\?source=meal-plan&week=${weekStartDate}$`)
  );
  await expect(
    page.getByRole("heading", { name: "Grocery list for this week" })
  ).toBeVisible();
  const weekSummary = page.getByText(/^Meal plan · /).first();
  const weekRange = (await weekSummary.textContent())!.replace("Meal plan · ", "");
  await expect(page.getByRole("textbox", { name: "List title" })).toHaveValue(
    `Groceries · ${weekRange}`
  );

  const plannedRecipes = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Planned recipes" }) });
  await expect(
    plannedRecipes.getByRole("listitem").filter({ hasText: repeatedRecipeTitle })
  ).toContainText("Saved yield: 4 · Planned: 8 · Scale 2×");
  await expect(
    plannedRecipes.getByRole("listitem").filter({ hasText: removedRecipeTitle })
  ).toContainText("Saved yield: 2 · Planned: 2 · Scale 1×");

  await page.getByRole("textbox", { name: "List title" }).fill(groceryListTitle);
  await page.getByRole("button", { name: "Review items" }).click();
  const previewHeading = page.getByRole("heading", { name: "Shopping items" });
  await expect(previewHeading).toBeVisible();
  const preview = previewHeading.locator("../..");
  await expect(preview.locator(":scope > ul > li")).toHaveCount(2);
  await expect(preview.getByText("2 tbsp + 1 tsp", { exact: true })).toBeVisible();
  await expect(preview.getByText("Used in 2 recipes", { exact: true })).toBeVisible();
  const ricePreviewRow = preview.getByText("Rice", { exact: true }).locator("..");
  await expect(
    ricePreviewRow.locator(":scope > p").filter({ hasText: /^1 cup$/ })
  ).toBeVisible();

  await page.getByRole("button", { name: "Create grocery list" }).click();
  await expect(page.getByRole("heading", { name: groceryListTitle })).toBeVisible();
  const groceryListUrl = page.url();
  await expect(page.getByText(`Meal plan · ${weekRange}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh from week" })).toBeVisible();

  await page.getByRole("button", { name: "Edit Pepper" }).click();
  const pepperEditor = page.getByRole("dialog", { name: "Edit Pepper" });
  await pepperEditor
    .getByRole("button", { name: "Set a practical shopping amount" })
    .click();
  await pepperEditor.getByRole("textbox", { name: "Amount" }).fill("1");
  await pepperEditor.getByRole("textbox", { name: "Unit" }).fill("jar");
  await pepperEditor.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("checkbox", { name: "Mark Pepper as bought" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  const addItemDialog = page.getByRole("dialog", { name: "Add item" });
  await addItemDialog.getByRole("textbox", { name: "Item" }).fill(manualItem);
  await addItemDialog.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(page.getByRole("button", { name: `Edit ${manualItem}` })).toBeVisible();

  await page.goto(`/meal-planner?week=${weekStartDate}`);
  const repeatedMeals = page.getByRole("button", {
    name: new RegExp(`^Edit ${repeatedRecipeTitle} on `)
  });
  await repeatedMeals.first().click();
  let mealEditor = page.getByRole("dialog", { name: "Edit meal" });
  await mealEditor
    .getByRole("spinbutton", { name: "Planned servings" })
    .fill("4");
  await mealEditor.getByRole("button", { name: "Save changes" }).click();

  await page
    .getByRole("button", { name: new RegExp(`^Edit ${removedRecipeTitle} on `) })
    .click();
  mealEditor = page.getByRole("dialog", { name: "Edit meal" });
  await mealEditor.getByRole("button", { name: "Remove meal" }).click();
  await expect(mealEditor).not.toBeVisible();
  await addMealToWeek(page, weekStartDate!, addedRecipeTitle, 3, "3");

  await page.goto(groceryListUrl);
  await expect(page.getByRole("button", { name: "Edit Rice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Carrots" })).toHaveCount(0);
  await page.getByRole("button", { name: "Completed (1)" }).click();
  await expect(page.getByText("Used in 2 recipes", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Refresh from week" }).click();
  await expect(page.getByText(/Grocery list refreshed from/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Rice" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Edit ${manualItem}` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Carrots" })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Mark Carrots as bought" })
  ).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Edit Pepper" })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Mark Pepper as not bought" })
  ).toBeChecked();
  await expect(page.getByText("1 jar", { exact: true })).toBeVisible();

  const pepperRow = page
    .getByRole("button", { name: "Edit Pepper" })
    .locator("xpath=ancestor::li");
  await pepperRow.getByText("Recipe requirements", { exact: true }).click();
  await expect(
    pepperRow.locator("details ul").first().getByText("2½ tbsp", { exact: true })
  ).toBeVisible();
  await expect(
    pepperRow.getByText(`From ${repeatedRecipeTitle}`, { exact: true })
  ).toBeVisible();
  await expect(page.getByText("1 of 3 items checked", { exact: true })).toBeVisible();

  const addItemButton = page.getByRole("button", { name: "Add item" });
  await addItemButton.focus();
  await page.keyboard.press("Enter");
  const keyboardDialog = page.getByRole("dialog", { name: "Add item" });
  await expect(keyboardDialog).toBeVisible();
  await expect(
    keyboardDialog.getByRole("button", { name: "Close add item" })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keyboardDialog.getByRole("textbox", { name: "Item" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(keyboardDialog).not.toBeVisible();
  await expect(addItemButton).toBeFocused();

  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("button", { name: "Refresh from week" })).toBeVisible();
  await expect(addItemButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Carrots" })).toBeVisible();
  const overflowingElements = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && (bounds.left < -1 || bounds.right > viewportWidth + 1);
      })
      .map((element) => ({
        ariaLabel: element.getAttribute("aria-label"),
        className: element.className,
        tagName: element.tagName,
        text: element.textContent?.trim().slice(0, 80)
      }));
  });
  expect(overflowingElements).toEqual([]);
});
