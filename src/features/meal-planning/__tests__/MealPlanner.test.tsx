import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWeekDates, getWeekStart } from "../meal-planning.dates";
import type { MealPlanWeekDto } from "../meal-planning.types";

const mocks = vi.hoisted(() => ({
  addEntry: vi.fn(),
  removeEntry: vi.fn(),
  refetchRecipeOptions: vi.fn(),
  recipeOptionsResult: {} as Record<string, unknown>,
  resetAdd: vi.fn(),
  resetRemove: vi.fn(),
  resetRestore: vi.fn(),
  restoreEntry: vi.fn(),
  restoreError: null as unknown,
  restorePending: false,
  weekResult: {} as Record<string, unknown>
}));

vi.mock("../meal-planning.queries", () => ({
  useMealPlanWeek: () => mocks.weekResult,
  useMealPlanRecipeOptions: () => mocks.recipeOptionsResult,
  useAddMealPlanEntry: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.addEntry,
    reset: mocks.resetAdd
  }),
  useRemoveMealPlanEntry: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.removeEntry,
    reset: mocks.resetRemove,
    variables: undefined
  }),
  useRestoreMealPlanEntry: () => ({
    error: mocks.restoreError,
    isPending: mocks.restorePending,
    mutateAsync: mocks.restoreEntry,
    reset: mocks.resetRestore
  })
}));

import { MealPlanner } from "../MealPlanner";

function currentWeek(): MealPlanWeekDto {
  const weekStartDate = getWeekStart(new Date());
  const [monday, , , thursday] = getWeekDates(weekStartDate);

  return {
    entries: [
      {
        id: "entry-1",
        mealType: "breakfast",
        planId: "plan-1",
        plannedFor: monday,
        recipe: {
          archived: false,
          id: "recipe-1",
          servings: 2,
          title: "Berry overnight oats"
        },
        servings: 2
      },
      {
        id: "entry-2",
        mealType: "dinner",
        planId: "plan-1",
        plannedFor: thursday,
        recipe: {
          archived: false,
          id: "recipe-2",
          servings: 4,
          title: "Coconut lentil curry"
        },
        servings: 4
      }
    ],
    planId: "plan-1",
    weekStartDate
  };
}

function loadedWeek(data: MealPlanWeekDto) {
  mocks.weekResult = {
    data,
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn()
  };
}

describe("MealPlanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.restoreError = null;
    mocks.restorePending = false;
    mocks.recipeOptionsResult = {
      data: [
        {
          archived: false,
          id: "recipe-2",
          ingredientNames: ["lentils"],
          mealTypes: ["dinner"],
          servings: 4,
          title: "Coconut lentil curry"
        }
      ],
      error: null,
      isPending: false,
      refetch: mocks.refetchRecipeOptions
    };
    const week = currentWeek();
    loadedWeek(week);
    mocks.addEntry.mockResolvedValue(undefined);
    mocks.restoreEntry.mockResolvedValue(undefined);
    mocks.removeEntry.mockImplementation(async ({ entryId, weekStartDate }) =>
      entryId === "entry-2"
        ? {
            mealType: "dinner",
            plannedFor: week.entries[1].plannedFor,
            recipeId: "recipe-2",
            servings: 4,
            weekStartDate
          }
        : {
            mealType: "breakfast",
            plannedFor: week.entries[0].plannedFor,
            recipeId: "recipe-1",
            servings: 2,
            weekStartDate
          }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a seven-day current-week agenda with direct actions", async () => {
    render(<MealPlanner />);

    expect(await screen.findByRole("heading", { name: "Meal planner" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Add meal to / })).toHaveLength(7);
    expect(screen.getByRole("link", { name: "Berry overnight oats" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1"
    );
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("2 servings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Berry overnight oats from Monday" })).toBeInTheDocument();
  });

  it("adds a recipe using its single meal type and saved servings as defaults", async () => {
    render(<MealPlanner />);
    const thursdaySection = await screen.findByRole("region", {
      name: /^Thursday /
    });
    const addButton = within(thursdaySection).getByRole("button", {
      name: /^Add meal to Thursday/
    });
    fireEvent.click(addButton);

    const dialog = screen.getByRole("dialog", { name: "Add meal" });
    expect(within(dialog).getByRole("button", { name: "Close add meal" })).toHaveFocus();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Recipe" }), {
      target: { value: "recipe-2" }
    });

    expect(within(dialog).getByRole("combobox", { name: "Meal" })).toHaveValue("dinner");
    expect(within(dialog).getByRole("spinbutton", { name: "Servings" })).toHaveValue(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to Thursday" }));

    await waitFor(() =>
      expect(mocks.addEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          mealType: "dinner",
          plannedFor: currentWeek().entries[1].plannedFor,
          recipeId: "recipe-2",
          servings: 4
        })
      )
    );
    expect(screen.queryByRole("dialog", { name: "Add meal" })).not.toBeInTheDocument();
    await waitFor(() => expect(addButton).toHaveFocus());
  });

  it("removes a meal, restores it with Undo, and expires the latest Undo", async () => {
    render(<MealPlanner />);
    await screen.findByRole("heading", { name: "Meal planner" });

    fireEvent.click(screen.getByRole("button", {
      name: "Remove Berry overnight oats from Monday"
    }));
    const undo = await screen.findByRole("button", { name: "Undo" });
    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveTextContent("Berry overnight oats removed");

    fireEvent.click(undo);
    await waitFor(() =>
      expect(mocks.restoreEntry).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: "recipe-1", servings: 2 })
      )
    );
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", {
        name: "Remove Berry overnight oats from Monday"
      }));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("replaces the prior Undo when another meal is removed", async () => {
    render(<MealPlanner />);
    await screen.findByRole("heading", { name: "Meal planner" });

    fireEvent.click(screen.getByRole("button", {
      name: "Remove Berry overnight oats from Monday"
    }));
    expect(await screen.findByText("Berry overnight oats removed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Remove Coconut lentil curry from Thursday"
    }));
    expect(await screen.findByText("Coconut lentil curry removed")).toBeInTheDocument();
    expect(screen.queryByText("Berry overnight oats removed")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
  });

  it("keeps Undo available while a delayed restore fails", async () => {
    let rejectRestore: ((error: Error) => void) | undefined;
    mocks.restoreEntry.mockImplementationOnce(
      () => new Promise((_, reject) => {
        rejectRestore = reject;
      })
    );
    const view = render(<MealPlanner />);
    await screen.findByRole("heading", { name: "Meal planner" });
    fireEvent.click(screen.getByRole("button", {
      name: "Remove Berry overnight oats from Monday"
    }));
    const undo = await screen.findByRole("button", { name: "Undo" });

    fireEvent.click(undo);
    mocks.restorePending = true;
    view.rerender(<MealPlanner />);
    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByText("Restoring...")).toBeInTheDocument();

    await act(async () => {
      rejectRestore?.(new Error("restore failed"));
      await Promise.resolve();
    });
    mocks.restorePending = false;
    mocks.restoreError = new Error("restore failed");
    view.rerender(<MealPlanner />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not restore that meal. Please try again."
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("restores an archived planned recipe through Undo", async () => {
    const week = currentWeek();
    loadedWeek({
      ...week,
      entries: [
        {
          ...week.entries[0],
          recipe: { ...week.entries[0].recipe, archived: true }
        }
      ]
    });
    render(<MealPlanner />);

    expect(await screen.findByText("Archived recipe", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Remove Berry overnight oats from Monday"
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() =>
      expect(mocks.restoreEntry).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: "recipe-1" })
      )
    );
  });

  it("keeps all seven day actions alongside the empty-week prompt", async () => {
    const week = currentWeek();
    loadedWeek({ ...week, entries: [], planId: null });

    render(<MealPlanner />);

    expect(await screen.findByRole("heading", { name: "Plan your week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add your first meal" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Add meal to / })).toHaveLength(7);
  });

  it("retries recipe options from the open add sheet", async () => {
    mocks.recipeOptionsResult = {
      data: [],
      error: new Error("load failed"),
      isPending: false,
      refetch: mocks.refetchRecipeOptions
    };
    render(<MealPlanner />);
    const mondaySection = await screen.findByRole("region", { name: /^Monday / });
    fireEvent.click(within(mondaySection).getByRole("button", {
      name: /^Add meal to Monday/
    }));

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetchRecipeOptions).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Add meal" })).toBeInTheDocument();
  });
});
