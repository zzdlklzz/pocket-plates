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
    weekDates: [
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23"
    ] as const,
    weekStartDate: "2026-08-17" as const
  };
}

describe("MealPlanEntrySheet", () => {
  it("starts on the clicked day and offers only the displayed boundary week", () => {
    const props = sheetProps();
    const weekDates = [
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03"
    ] as const;
    render(
      <MealPlanEntrySheet
        {...props}
        plannedFor="2026-12-31"
        weekDates={weekDates}
        weekStartDate="2026-12-28"
      />
    );

    const daySelect = screen.getByRole("combobox", { name: "Day" });
    expect(daySelect).toHaveValue("2026-12-31");
    expect(
      within(daySelect).getAllByRole("option").map((option) => option.getAttribute("value"))
    ).toEqual(weekDates);
  });

  it("submits a different selected day through the existing add contract", async () => {
    const props = sheetProps();
    render(<MealPlanEntrySheet {...props} />);
    const dialog = screen.getByRole("dialog", { name: "Add meal" });

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Day" }), {
      target: { value: "2026-08-21" }
    });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Recipe" }), {
      target: { value: "recipe-1" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to Friday" }));

    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        mealType: "dinner",
        plannedFor: "2026-08-21",
        recipeId: "recipe-1",
        servings: 2,
        weekStartDate: "2026-08-17"
      })
    );
  });

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
    expect(screen.getByRole("combobox", { name: "Day" })).toBeDisabled();
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

  it("edits an archived entry without showing it in the active recipe picker", async () => {
    const props = sheetProps();
    const entry = {
      id: "entry-1",
      mealType: "dinner" as const,
      planId: "plan-1",
      plannedFor: "2026-08-19" as const,
      recipe: {
        archived: true,
        id: "recipe-1",
        servings: 2,
        title: "Ginger tofu bowls"
      },
      servings: 2
    };
    render(<MealPlanEntrySheet {...props} entry={entry} />);
    const dialog = screen.getByRole("dialog", { name: "Edit meal" });

    expect(dialog).toHaveClass("max-h-[calc(100dvh-1rem)]", "overflow-hidden");
    expect(within(dialog).getByText("Archived recipe")).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText("Title or ingredient")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Day" }), {
      target: { value: "2026-08-21" }
    });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Meal" }), {
      target: { value: "snack" }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Servings" }), {
      target: { value: "3" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        mealType: "snack",
        plannedFor: "2026-08-21",
        recipeId: "recipe-1",
        servings: 3,
        weekStartDate: "2026-08-17"
      })
    );
  });

  it("shows exact duplicate feedback while keeping edit fields available", () => {
    const props = sheetProps();
    render(
      <MealPlanEntrySheet
        {...props}
        entry={{
          id: "entry-1",
          mealType: "dinner",
          planId: "plan-1",
          plannedFor: "2026-08-19",
          recipe: {
            archived: false,
            id: "recipe-1",
            servings: 2,
            title: "Ginger tofu bowls"
          },
          servings: 2
        }}
        error={new Error("This recipe is already planned for that meal.")}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This recipe is already planned for that meal."
    );
    expect(screen.getByRole("combobox", { name: "Day" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("prevents save and remove actions from overlapping", () => {
    const props = sheetProps();
    render(
      <MealPlanEntrySheet
        {...props}
        entry={{
          id: "entry-1",
          mealType: "dinner",
          planId: "plan-1",
          plannedFor: "2026-08-19",
          recipe: {
            archived: false,
            id: "recipe-1",
            servings: 2,
            title: "Ginger tofu bowls"
          },
          servings: 2
        }}
        isRemovePending
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Removing meal..." })).toBeDisabled();
  });
});
