import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_LOCAL_SUPABASE,
  "Authenticated grocery-list tests require the local Supabase runner."
);

test("manages a standalone grocery list across reloads", async ({
  page
}, testInfo) => {
  const uniqueSuffix = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `grocery-lists-${uniqueSuffix}@example.test`;
  const initialTitle = `Weekend shop ${uniqueSuffix}`;
  const renamedTitle = `Weekly shop ${uniqueSuffix}`;
  const initialItem = `Spinach ${uniqueSuffix}`;
  const editedItem = `Baby spinach ${uniqueSuffix}`;

  await page.goto("/");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("local-test-password");
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();

  await expect(page.getByRole("heading", { name: "PocketPlates" })).toBeVisible();
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
