import { expect, test } from "@playwright/test";

test("redirects signed-out visitors away from the meal planner", async ({ page }) => {
  await page.goto("/meal-planner");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Your private recipe shelf." })).toBeVisible();
});

test.describe("with local Supabase", () => {
  test.skip(
    !process.env.E2E_LOCAL_SUPABASE,
    "Authenticated meal planner tests require the local Supabase runner."
  );

  test("adds, removes, and restores a meal in the current week", async ({
    page
  }, testInfo) => {
    const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `meal-planner-${uniqueSuffix}@example.test`;
    const recipeTitle = `Weeknight pasta ${uniqueSuffix}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("local-test-password");
    await page.getByRole("button", { name: "Create account", exact: true }).last().click();

    await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
    await page.getByRole("link", { name: "Add recipe" }).click();
    await page.getByRole("button", { name: "Dinner", exact: true }).click();
    await page.getByLabel("Ingredient", { exact: true }).fill("Pasta");
    await page.getByLabel("Instruction", { exact: true }).fill("Cook the pasta, then serve.");
    await page.getByLabel("Title").fill(recipeTitle);
    await page.getByRole("button", { name: "Save recipe" }).click();

    await expect(page.getByRole("heading", { name: recipeTitle })).toBeVisible();
    await page.getByRole("link", { name: "Library" }).click();
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Meal planner" }).click();

    await expect(page.getByRole("heading", { name: "Meal planner" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Days in this week" }).getByRole("listitem"))
      .toHaveCount(7);
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);

    const addMealActions = page.getByRole("button", { name: /^Add meal to / });
    await expect(addMealActions).toHaveCount(7);
    await addMealActions.first().click();

    const addMealDialog = page.getByRole("dialog", { name: "Add meal" });
    await addMealDialog.getByRole("combobox", { name: "Recipe" }).selectOption({
      label: recipeTitle
    });
    await addMealDialog.getByRole("combobox", { name: "Meal" }).selectOption({ label: "Dinner" });
    await addMealDialog.getByRole("spinbutton", { name: "Servings" }).fill("3");
    await addMealDialog.getByRole("button", { name: /^Add to / }).click();

    await expect(page.getByRole("link", { name: recipeTitle })).toBeVisible();
    await expect(page.getByText("3 servings", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: new RegExp(`^Remove ${recipeTitle} from `) }).click();
    await expect(page.getByRole("link", { name: recipeTitle })).not.toBeVisible();
    await expect(page.getByText(`${recipeTitle} removed`, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByRole("link", { name: recipeTitle })).toBeVisible();
    await expect(page.getByText("3 servings", { exact: true })).toBeVisible();
  });
});
