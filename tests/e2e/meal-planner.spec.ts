import { expect, test } from "@playwright/test";

function addIsoDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

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

  test("manages a meal across week navigation and reloads", async ({
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
    await page.getByLabel("Servings", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Save recipe" }).click();

    await expect(page.getByRole("heading", { name: recipeTitle })).toBeVisible();
    await page.getByRole("link", { name: "Library" }).click();
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Meal planner" }).click();

    await expect(page.getByRole("heading", { name: "Meal planner" })).toBeVisible();
    const weekDays = page.getByRole("list", { name: "Days in this week" });
    await expect(weekDays.getByRole("listitem")).toHaveCount(7);
    await expect(weekDays.locator('[aria-current="date"]')).toHaveCount(1);

    await page.getByRole("button", { name: "This week" }).click();
    await expect(page).toHaveURL(/\/meal-planner\?week=\d{4}-\d{2}-\d{2}$/);
    const currentWeek = new URL(page.url()).searchParams.get("week");
    expect(currentWeek).toBeTruthy();

    const addMealActions = page.getByRole("button", { name: /^Add meal to / });
    await expect(addMealActions).toHaveCount(7);
    await addMealActions.first().click();

    const addMealDialog = page.getByRole("dialog", { name: "Add meal" });
    const addDay = addMealDialog.getByRole("combobox", { name: "Day" });
    const plannedServings = addMealDialog.getByRole("spinbutton", {
      name: "Planned servings"
    });
    await expect(addDay).toBeEnabled();
    await expect(addDay.getByRole("option")).toHaveCount(7);
    await expect(addDay).toHaveValue(currentWeek!);
    await addDay.selectOption({ value: addIsoDays(currentWeek!, 1) });
    await expect(plannedServings).toHaveValue("1");
    await addMealDialog.getByRole("searchbox", { name: "Search recipes" }).fill("Pasta");
    const recipeSearchResults = addMealDialog.getByRole("region", {
      name: "Recipe search results"
    });
    await expect(addMealDialog.getByRole("status")).toHaveText("1 match");
    await expect(recipeSearchResults).toBeVisible();
    await expect(recipeSearchResults).toHaveClass(/max-h-56/);
    await expect(recipeSearchResults).toHaveClass(/overflow-y-auto/);
    await recipeSearchResults
      .getByRole("button", { name: `Select ${recipeTitle}` })
      .click();
    await expect(addMealDialog.getByRole("combobox", { name: "Recipe" })).toHaveValue(
      /.+/
    );
    await expect(plannedServings).toHaveValue("1");
    await expect(plannedServings).toHaveAccessibleDescription(
      /Defaults to 1.*Saved recipe makes 4 servings\./
    );
    await expect(addMealDialog.getByRole("combobox", { name: "Meal" })).toHaveValue(
      "dinner"
    );
    await plannedServings.fill("3");
    await addMealDialog.getByRole("button", { name: "Add to Tuesday" }).click();

    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).toBeVisible();
    await expect(page.getByText("3 servings", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Remove ${recipeTitle} from Tuesday` }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).not.toBeVisible();
    await expect(page.getByText(`${recipeTitle} removed`, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).toBeVisible();
    await expect(page.getByText("3 servings", { exact: true })).toBeVisible();

    await page.goto("/meal-planner?week=2026-12-31");
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-28$/);
    await page.reload();
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-28$/);
    const weekRange = page
      .getByRole("heading", { name: "Meal planner" })
      .locator("..")
      .locator("p")
      .last();

    await page.getByRole("button", { name: "Previous week" }).click();
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-21$/);
    await expect(weekRange).toContainText(/21.*27.*2026/);
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-28$/);
    await expect(weekRange).toContainText(/28.*2026.*3.*2027/);

    await page.goBack();
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-21$/);
    await expect(weekRange).toContainText(/21.*27.*2026/);
    await page.goForward();
    await expect(page).toHaveURL(/\/meal-planner\?week=2026-12-28$/);
    await expect(weekRange).toContainText(/28.*2026.*3.*2027/);

    await page.getByRole("button", { name: "This week" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/meal-planner\\?week=${currentWeek}$`)
    );

    await page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` }).click();
    const editMealDialog = page.getByRole("dialog", { name: "Edit meal" });
    await editMealDialog.getByRole("combobox", { name: "Day" }).selectOption({
      value: currentWeek!
    });
    await editMealDialog.getByRole("combobox", { name: "Meal" }).selectOption({
      label: "Lunch"
    });
    await editMealDialog.getByRole("spinbutton", { name: "Planned servings" }).fill("5");
    await editMealDialog.getByRole("button", { name: "Save changes" }).click();

    const editedMeal = page.getByRole("button", {
      name: `Edit ${recipeTitle} on Monday`
    });
    await expect(editedMeal).toContainText("Lunch");
    await expect(editedMeal).toContainText("5 servings");

    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`/meal-planner\\?week=${currentWeek}$`)
    );
    await expect(editedMeal).toContainText("Lunch");
    await expect(editedMeal).toContainText("5 servings");

    const monday = page.getByRole("region", { name: /^Monday / });
    await monday.getByRole("button", { name: "Copy meals from Monday" }).click();
    await expect(page.getByText(/1 meal copied from Monday/)).toBeVisible();

    await page.getByRole("button", { name: "Paste copied day to Tuesday" }).click();
    const dayPasteDialog = page.getByRole("dialog", { name: "Paste copied day?" });
    await expect(
      dayPasteDialog.getByText("Ready to add", { exact: true }).locator("..")
    ).toContainText("1");
    await expect(
      dayPasteDialog.getByText("Duplicates", { exact: true }).locator("..")
    ).toContainText("0");
    await dayPasteDialog.getByRole("button", { name: "Paste 1 meal" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).toContainText("5 servings");

    const prepSummaryTrigger = page.getByRole("button", {
      name: "Prep summary · 1 recipe"
    });
    await prepSummaryTrigger.click();
    const prepSummaryDialog = page.getByRole("dialog", {
      name: "Weekly prep summary"
    });
    await expect(
      prepSummaryDialog.getByText("1 recipe · 10 planned servings")
    ).toBeVisible();
    await expect(prepSummaryDialog.getByText("Mon · Tue")).toBeVisible();
    await expect(prepSummaryDialog.getByText("Need 10 servings")).toBeVisible();
    await expect(
      prepSummaryDialog.getByText("Saved recipe makes 4 servings")
    ).toBeVisible();
    await expect(prepSummaryDialog.getByText("Scale 2.5×")).toBeVisible();
    await prepSummaryDialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(prepSummaryDialog).not.toBeVisible();

    await page.getByRole("button", { name: "Copy week" }).click();
    await expect(page.getByText(/2 meals copied from/)).toBeVisible();
    await page.getByRole("button", { name: "Next week" }).click();
    const nextWeek = addIsoDays(currentWeek!, 7);
    await expect(page).toHaveURL(new RegExp(`/meal-planner\\?week=${nextWeek}$`));

    await page.getByRole("button", { name: "Paste copied week" }).click();
    const firstWeekPasteDialog = page.getByRole("dialog", {
      name: "Paste copied week?"
    });
    await expect(
      firstWeekPasteDialog.getByText("Ready to add", { exact: true }).locator("..")
    ).toContainText("2");
    await expect(
      firstWeekPasteDialog.getByText("Duplicates", { exact: true }).locator("..")
    ).toContainText("0");
    await firstWeekPasteDialog.getByRole("button", { name: "Paste 2 meals" }).click();

    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Monday` })
    ).toBeVisible();

    await page.getByRole("button", { name: `Remove ${recipeTitle} from Tuesday` }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Tuesday` })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Edit ${recipeTitle} on Monday` })
    ).toBeVisible();
    await page.getByRole("button", { name: "Paste week" }).click();
    const repeatedWeekPasteDialog = page.getByRole("dialog", {
      name: "Paste copied week?"
    });
    await expect(
      repeatedWeekPasteDialog.getByText("Ready to add", { exact: true }).locator("..")
    ).toContainText("1");
    await expect(
      repeatedWeekPasteDialog.getByText("Duplicates", { exact: true }).locator("..")
    ).toContainText("1");
    await repeatedWeekPasteDialog.getByRole("button", { name: "Paste 1 meal" }).click();

    await expect(
      page.getByRole("button", { name: new RegExp(`^Edit ${recipeTitle} on `) })
    ).toHaveCount(2);
    await expect(page.getByText(/1 meal added\. Skipped: 1 duplicate/)).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/meal-planner\\?week=${nextWeek}$`));
    await expect(
      page.getByRole("button", { name: new RegExp(`^Edit ${recipeTitle} on `) })
    ).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Paste week" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Paste copied day to / })).toHaveCount(0);
    await expect(page.getByText(/Copied week remains ready to paste again/)).toHaveCount(0);
  });
});
