import { expect, test } from "@playwright/test";

test("shows the PocketPlates auth screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Your private recipe shelf." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
