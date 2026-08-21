import { fireEvent, render, screen, within } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MealPlanPrepDialog } from "../MealPlanPrepDialog";
import type { MealPlanPrepSummary } from "../meal-planning.prep";

const summary: MealPlanPrepSummary = {
  rows: [
    {
      appearanceCount: 2,
      archived: false,
      plannedDates: ["2026-08-17", "2026-08-20"],
      recipeId: "recipe-1",
      savedRecipeYield: 4,
      title: "Coconut lentil curry",
      totalPlannedServings: 2
    },
    {
      appearanceCount: 2,
      archived: true,
      plannedDates: ["2026-08-18"],
      recipeId: "recipe-2",
      savedRecipeYield: 2,
      title: "Berry overnight oats",
      totalPlannedServings: 3
    }
  ],
  totalPlannedServings: 5
};

describe("MealPlanPrepDialog", () => {
  it("shows grouped totals, days, yields, scales, and archived context", () => {
    render(
      <MealPlanPrepDialog
        onClose={vi.fn()}
        returnFocusRef={{ current: null }}
        summary={summary}
      />
    );
    const dialog = screen.getByRole("dialog", { name: "Weekly prep summary" });

    expect(dialog).toHaveClass("max-h-[calc(100dvh-1rem)]", "overflow-hidden");
    const closeButton = within(dialog).getByRole("button", {
      name: "Close prep summary"
    });
    const footerCloseButton = within(dialog).getByRole("button", { name: "Close" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(footerCloseButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    expect(within(dialog).getByText("2 recipes · 5 planned servings")).toBeInTheDocument();
    expect(within(dialog).getByText("Mon · Thu")).toBeInTheDocument();
    expect(within(dialog).getByText("Tue · 2 appearances")).toBeInTheDocument();
    expect(within(dialog).getByText("Need 2 servings")).toBeInTheDocument();
    expect(within(dialog).getByText("Saved recipe makes 4 servings")).toBeInTheDocument();
    expect(within(dialog).getByText("Scale 0.5×")).toBeInTheDocument();
    expect(within(dialog).getByText("Archived recipe")).toBeInTheDocument();
    expect(within(dialog).getByText("Scale 1.5×")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", {
        name: "View Coconut lentil curry recipe"
      })
    ).toHaveAttribute("href", "/recipes/recipe-1");
    expect(
      within(dialog).queryByRole("link", {
        name: "View Berry overnight oats recipe"
      })
    ).not.toBeInTheDocument();
  });

  it("closes with Escape or the backdrop and returns focus", () => {
    function DialogHarness() {
      const [isOpen, setIsOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);

      return (
        <>
          <button onClick={() => setIsOpen(true)} ref={triggerRef} type="button">
            Prep summary
          </button>
          {isOpen ? (
            <MealPlanPrepDialog
              onClose={() => setIsOpen(false)}
              returnFocusRef={triggerRef}
              summary={summary}
            />
          ) : null}
        </>
      );
    }

    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Prep summary" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Weekly prep summary" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Weekly prep summary" });
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.queryByRole("dialog", { name: "Weekly prep summary" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
