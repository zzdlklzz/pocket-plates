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
