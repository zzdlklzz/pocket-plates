import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_LOCAL_SUPABASE, "Authenticated discovery tests require the local Supabase runner.");

test("creates, edits, reloads, and filters private discovery metadata", async ({ page }, testInfo) => {
  const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `discovery-${uniqueSuffix}@example.test`;
  const initialTitle = `Microwave rice ${uniqueSuffix}`;
  const updatedTitle = `Quick rice bowl ${uniqueSuffix}`;

  await page.goto("/");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("local-test-password");
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();

  await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
  await page.getByRole("link", { name: "Add recipe" }).click();

  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await page.getByRole("button", { name: "Quick", exact: true }).click();
  await page.getByRole("button", { name: "Low cleanup", exact: true }).click();
  await page.getByRole("button", { name: "Microwave", exact: true }).click();
  await page.getByRole("button", { name: "No oven needed", exact: true }).click();
  await page.getByLabel("Ingredient", { exact: true }).fill("Rice");
  await page.getByLabel("Instruction", { exact: true }).fill("Cook the rice, then serve.");
  await page.getByLabel("Title").fill(initialTitle);
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: initialTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "At a glance" }).locator(".."))
    .toContainText("Quick");
  await expect(page.getByRole("heading", { name: "At a glance" }).locator(".."))
    .toContainText("Low cleanup");
  await expect(page.getByRole("heading", { name: "Equipment & setup" }).locator(".."))
    .toContainText("Microwave");
  await expect(page.getByRole("heading", { name: "Equipment & setup" }).locator(".."))
    .toContainText("No oven needed");

  await page.reload();
  await expect(page.getByRole("heading", { name: initialTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Equipment & setup" }).locator(".."))
    .toContainText("Microwave");

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Title").fill(updatedTitle);
  await page.getByRole("button", { name: "One pot", exact: true }).click();
  await page.getByRole("button", { name: "Rice cooker", exact: true }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "At a glance" }).locator(".."))
    .toContainText("One pot");
  await expect(page.getByRole("heading", { name: "Equipment & setup" }).locator(".."))
    .toContainText("Rice cooker");

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByPlaceholder("Search titles or ingredients").fill("Rice");
  await page.getByRole("button", { name: "Filters" }).click();

  const filterDialog = page.getByRole("dialog", { name: "Recipe filters" });
  await filterDialog.getByRole("button", { name: "Quick", exact: true }).click();
  await filterDialog.getByRole("button", { name: "One pot", exact: true }).click();
  await filterDialog.getByRole("button", { name: "Microwave", exact: true }).click();
  await filterDialog.getByRole("button", { name: "Rice cooker", exact: true }).click();

  if (testInfo.project.name === "mobile-safari-size") {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "24px";
    });
    await filterDialog.getByRole("button", { name: "Done", exact: true }).scrollIntoViewIfNeeded();
  }

  await filterDialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();

  await page.getByRole("button", { name: "Remove Effort: One pot filter" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await page.getByRole("button", { name: "Remove Equipment: Rice cooker filter" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByPlaceholder("Search titles or ingredients")).toHaveValue("Rice");

  await page.getByPlaceholder("Search titles or ingredients").fill("ingredient-that-does-not-exist");
  await expect(page.getByText("No matching recipes")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
});
