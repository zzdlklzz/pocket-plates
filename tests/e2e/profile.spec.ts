import { expect, test } from "@playwright/test";

test("redirects signed-out visitors away from the profile editor", async ({
  page
}) => {
  await page.goto("/profile");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Your private recipe shelf." })
  ).toBeVisible();
});

test.describe("with local Supabase", () => {
  test.skip(
    !process.env.E2E_LOCAL_SUPABASE,
    "Authenticated profile tests require the local Supabase runner."
  );

  test("saves a normalized identity and rejects a duplicate username", async ({
    page
  }, testInfo) => {
    const suffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const firstEmail = `profile-one-${suffix}@example.test`;
    const secondEmail = `profile-two-${suffix}@example.test`;
    const username = `cook_${Math.random().toString(36).slice(2, 10)}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByLabel("Email").fill(firstEmail);
    await page.getByLabel("Password").fill("local-test-password");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .last()
      .click();

    await expect(page.getByText(firstEmail, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("dialog", { name: "More" })
      .getByRole("link", { name: "Profile" })
      .click();

    await page.getByLabel("Display name").fill("  Dani   Lim  ");
    await page.getByLabel("Username").fill(`  ${username.toUpperCase()}  `);
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByRole("status")).toHaveText("Profile saved");
    await expect(page.getByLabel("Display name")).toHaveValue("Dani Lim");
    await expect(page.getByLabel("Username")).toHaveValue(username);

    await page.getByRole("link", { name: "Back" }).click();
    await expect(page.getByText("Dani Lim", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Dani Lim", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByLabel("Email").fill(secondEmail);
    await page.getByLabel("Password").fill("local-test-password");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .last()
      .click();

    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("dialog", { name: "More" })
      .getByRole("link", { name: "Profile" })
      .click();
    await page.getByLabel("Display name").fill("Second Cook");
    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("That username is already taken.")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeFocused();
  });
});
