import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealPlanEntrySheet } from "../MealPlanEntrySheet";

const recipeOptions = [
  {
    archived: false as const,
    id: "recipe-1",
    ingredientNames: ["rice"],
    mealTypes: ["dinner" as const],
    servings: 2,
    title: "Ginger tofu bowls"
  }
];

function sheetProps() {
  return {
    error: null,
    isPending: false,
    isRecipeOptionsLoading: false,
    onClose: vi.fn(),
    onRetryRecipeOptions: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    plannedFor: "2026-08-19" as const,
    recipeOptions,
    recipeOptionsError: null,
    returnFocusRef: { current: null },
    search: "",
    setSearch: vi.fn(),
    weekStartDate: "2026-08-17" as const
  };
}

describe("MealPlanEntrySheet", () => {
  it("contains a rejected save and keeps the sheet available for retry", async () => {
    const props = sheetProps();
    props.onSubmit.mockRejectedValueOnce(new Error("save failed"));
    render(<MealPlanEntrySheet {...props} error={new Error("save failed")} />);
    const dialog = screen.getByRole("dialog", { name: "Add meal" });

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Recipe" }), {
      target: { value: "recipe-1" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to Wednesday" }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog", { name: "Add meal" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not add this meal. Please try again."
    );
  });

  it("does not return focus or close on Escape when pending changes", () => {
    const props = sheetProps();
    const { rerender } = render(<MealPlanEntrySheet {...props} />);
    const closeButton = screen.getByRole("button", { name: "Close add meal" });
    expect(closeButton).toHaveFocus();

    rerender(<MealPlanEntrySheet {...props} isPending />);

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("retries loading recipe options without closing the sheet", () => {
    const props = sheetProps();
    render(
      <MealPlanEntrySheet
        {...props}
        recipeOptions={[]}
        recipeOptionsError={new Error("load failed")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(props.onRetryRecipeOptions).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Add meal" })).toBeInTheDocument();
  });
});
