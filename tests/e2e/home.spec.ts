import { expect, test } from "@playwright/test";

test("shows the PocketPlates starter library", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
  await expect(page.getByText("Rice Bowl")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add recipe" })).toBeVisible();
});
