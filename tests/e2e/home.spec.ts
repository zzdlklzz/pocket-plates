import { expect, test } from "@playwright/test";

test("shows the PocketPlates auth screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Your private recipe shelf." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resend confirmation" })).toBeVisible();
});

test("shows password reset and resend states", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();

  await page.getByRole("link", { name: "Resend confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Resend confirmation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend confirmation" })).toBeVisible();
});
