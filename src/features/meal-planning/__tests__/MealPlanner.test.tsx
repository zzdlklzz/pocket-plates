import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNextWeekStart, getWeekDates, getWeekStart } from "../meal-planning.dates";
import type { MealPlanWeekDto } from "../meal-planning.types";

const mocks = vi.hoisted(() => ({
  addEntry: vi.fn(),
  removeEntry: vi.fn(),
  removeError: null as unknown,
  removePending: false,
  refetchRecipeOptions: vi.fn(),
  recipeOptionsResult: {} as Record<string, unknown>,
  resetAdd: vi.fn(),
  resetRemove: vi.fn(),
  resetRestore: vi.fn(),
  restoreEntry: vi.fn(),
  restoreError: null as unknown,
  restorePending: false,
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  updateEntry: vi.fn(),
  updateError: null as unknown,
  updatePending: false,
  resetUpdate: vi.fn(),
  readWeek: vi.fn(),
  weekResult: {} as Record<string, unknown>
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace
  })
}));

vi.mock("../meal-planning.queries", () => ({
  useMealPlanWeek: (weekStartDate: string) => {
    mocks.readWeek(weekStartDate);
    return mocks.weekResult;
  },
  useMealPlanRecipeOptions: () => mocks.recipeOptionsResult,
  useAddMealPlanEntry: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.addEntry,
    reset: mocks.resetAdd
  }),
  useRemoveMealPlanEntry: () => ({
    error: mocks.removeError,
    isPending: mocks.removePending,
    mutateAsync: mocks.removeEntry,
    reset: mocks.resetRemove,
    variables: undefined
  }),
  useRestoreMealPlanEntry: () => ({
    error: mocks.restoreError,
    isPending: mocks.restorePending,
    mutateAsync: mocks.restoreEntry,
    reset: mocks.resetRestore
  }),
  useUpdateMealPlanEntry: () => ({
    error: mocks.updateError,
    isPending: mocks.updatePending,
    mutateAsync: mocks.updateEntry,
    reset: mocks.resetUpdate
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
    mocks.removeError = null;
    mocks.removePending = false;
    mocks.updateError = null;
    mocks.updatePending = false;
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
    mocks.updateEntry.mockResolvedValue(undefined);
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
    expect(screen.getByRole("link", { name: "View Berry overnight oats recipe" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1"
    );
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("2 servings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Berry overnight oats from Monday" })).toBeInTheDocument();
  });

  it("normalizes URL weeks and navigates across year boundaries", async () => {
    render(<MealPlanner requestedWeek="2026-12-31" />);

    await waitFor(() => expect(mocks.readWeek).toHaveBeenCalledWith("2026-12-28"));
    expect(mocks.routerReplace).toHaveBeenCalledWith(
      "/meal-planner?week=2026-12-28",
      { scroll: false }
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(mocks.routerPush).toHaveBeenLastCalledWith(
      "/meal-planner?week=2026-12-21",
      { scroll: false }
    );
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(mocks.routerPush).toHaveBeenLastCalledWith(
      "/meal-planner?week=2027-01-04",
      { scroll: false }
    );
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(mocks.routerPush).toHaveBeenLastCalledWith(
      `/meal-planner?week=${getWeekStart(new Date())}`,
      { scroll: false }
    );
  });

  it("canonicalizes a missing week to the browser-local Monday", async () => {
    const currentWeekStart = getWeekStart(new Date());

    render(<MealPlanner />);

    await waitFor(() =>
      expect(mocks.routerReplace).toHaveBeenCalledWith(
        `/meal-planner?week=${currentWeekStart}`,
        { scroll: false }
      )
    );
  });

  it("restores navigation focus and announces a query-only week change", async () => {
    const week = currentWeek();
    const nextWeekStart = getNextWeekStart(week.weekStartDate);
    const view = render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const nextButton = await screen.findByRole("button", { name: "Next week" });
    fireEvent.click(nextButton);
    mocks.weekResult = {
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
      refetch: vi.fn()
    };

    view.rerender(<MealPlanner requestedWeek={nextWeekStart} />);

    expect(screen.getByRole("button", { name: "Next week" })).toHaveFocus();
    const loadingStatus = screen.getByRole("status", { name: /^Loading meals for / });
    expect(loadingStatus).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText(/^Week range:/)).toHaveAttribute(
      "aria-live",
      "polite"
    );
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

  it("edits an entry's day, meal type, and servings", async () => {
    const week = currentWeek();
    const [, tuesday] = getWeekDates(week.weekStartDate);
    render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const editButton = await screen.findByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    });
    fireEvent.click(editButton);
    const dialog = screen.getByRole("dialog", { name: "Edit meal" });

    expect(within(dialog).getByRole("button", { name: "Close edit meal" })).toHaveFocus();
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Day" }), {
      target: { value: tuesday }
    });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Meal" }), {
      target: { value: "dinner" }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Servings" }), {
      target: { value: "5" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mocks.updateEntry).toHaveBeenCalledWith({
        entryId: "entry-1",
        mealType: "dinner",
        plannedFor: tuesday,
        servings: 5,
        weekStartDate: week.weekStartDate
      })
    );
    expect(screen.queryByRole("dialog", { name: "Edit meal" })).not.toBeInTheDocument();
    const tuesdaySection = screen.getByRole("region", { name: /^Tuesday / });
    await waitFor(() =>
      expect(within(tuesdaySection).getByRole("button", {
        name: /^Add meal to Tuesday/
      })).toHaveFocus()
    );
  });

  it("focuses the target day after a moved entry opener is removed", async () => {
    const week = currentWeek();
    const [, tuesday] = getWeekDates(week.weekStartDate);
    let finishUpdate: (() => void) | undefined;
    mocks.updateEntry.mockImplementationOnce(
      () => new Promise((resolve) => {
        finishUpdate = () => resolve(undefined);
      })
    );
    const view = render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const editButton = await screen.findByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    });
    fireEvent.click(editButton);
    const dialog = screen.getByRole("dialog", { name: "Edit meal" });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Day" }), {
      target: { value: tuesday }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    loadedWeek({
      ...week,
      entries: week.entries.map((entry) =>
        entry.id === "entry-1" ? { ...entry, plannedFor: tuesday } : entry
      )
    });
    view.rerender(<MealPlanner requestedWeek={week.weekStartDate} />);
    expect(document.body).not.toContainElement(editButton);

    await act(async () => finishUpdate?.());

    const tuesdaySection = screen.getByRole("region", { name: /^Tuesday / });
    await waitFor(() =>
      expect(within(tuesdaySection).getByRole("button", {
        name: /^Add meal to Tuesday/
      })).toHaveFocus()
    );
  });

  it("closes edit mode on Escape and restores focus to the entry", async () => {
    const week = currentWeek();
    render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const editButton = await screen.findByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    });
    fireEvent.click(editButton);
    expect(screen.getByRole("button", { name: "Close edit meal" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Edit meal" })).not.toBeInTheDocument();
    await waitFor(() => expect(editButton).toHaveFocus());
  });

  it("closes edit mode from its button and restores focus to the entry", async () => {
    const week = currentWeek();
    render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const editButton = await screen.findByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    });
    fireEvent.click(editButton);

    fireEvent.click(screen.getByRole("button", { name: "Close edit meal" }));

    expect(screen.queryByRole("dialog", { name: "Edit meal" })).not.toBeInTheDocument();
    await waitFor(() => expect(editButton).toHaveFocus());
  });

  it("focuses the day Add action after direct removal deletes its opener", async () => {
    const week = currentWeek();
    let finishRemove: ((value: {
      mealType: "breakfast";
      plannedFor: typeof week.entries[0]["plannedFor"];
      recipeId: string;
      servings: number;
      weekStartDate: typeof week.weekStartDate;
    }) => void) | undefined;
    mocks.removeEntry.mockImplementationOnce(
      () => new Promise((resolve) => {
        finishRemove = resolve;
      })
    );
    const view = render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const removeButton = await screen.findByRole("button", {
      name: "Remove Berry overnight oats from Monday"
    });
    fireEvent.click(removeButton);
    loadedWeek({
      ...week,
      entries: week.entries.filter((entry) => entry.id !== "entry-1")
    });
    view.rerender(<MealPlanner requestedWeek={week.weekStartDate} />);
    expect(document.body).not.toContainElement(removeButton);

    await act(async () =>
      finishRemove?.({
        mealType: "breakfast",
        plannedFor: week.entries[0].plannedFor,
        recipeId: "recipe-1",
        servings: 2,
        weekStartDate: week.weekStartDate
      })
    );

    const mondaySection = screen.getByRole("region", { name: /^Monday / });
    await waitFor(() =>
      expect(within(mondaySection).getByRole("button", {
        name: /^Add meal to Monday/
      })).toHaveFocus()
    );
  });

  it("renders different recipes in the same meal slot", async () => {
    const week = currentWeek();
    loadedWeek({
      ...week,
      entries: [
        ...week.entries,
        {
          id: "entry-3",
          mealType: "dinner",
          planId: "plan-1",
          plannedFor: week.entries[1].plannedFor,
          recipe: {
            archived: false,
            id: "recipe-3",
            servings: 2,
            title: "Roasted vegetables"
          },
          servings: 2
        }
      ]
    });
    render(<MealPlanner requestedWeek={week.weekStartDate} />);
    const thursday = await screen.findByRole("region", { name: /^Thursday / });

    expect(within(thursday).getByRole("button", {
      name: "Edit Coconut lentil curry on Thursday"
    })).toBeInTheDocument();
    expect(within(thursday).getByRole("button", {
      name: "Edit Roasted vegetables on Thursday"
    })).toBeInTheDocument();
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
    let finishRemove: ((value: {
      mealType: "breakfast";
      plannedFor: typeof week.entries[0]["plannedFor"];
      recipeId: string;
      servings: number;
      weekStartDate: typeof week.weekStartDate;
    }) => void) | undefined;
    mocks.removeEntry.mockImplementationOnce(
      () => new Promise((resolve) => {
        finishRemove = resolve;
      })
    );
    const view = render(<MealPlanner />);

    expect(await screen.findByText("Archived recipe", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("link", {
      name: "View Berry overnight oats recipe"
    })).not.toBeInTheDocument();
    const editButton = screen.getByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    });
    fireEvent.click(editButton);
    const dialog = screen.getByRole("dialog", { name: "Edit meal" });
    expect(within(dialog).getByText("Archived recipe")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove meal" }));
    loadedWeek({ ...week, entries: [], planId: "plan-1" });
    view.rerender(<MealPlanner />);
    expect(document.body).not.toContainElement(editButton);
    await act(async () =>
      finishRemove?.({
        mealType: "breakfast",
        plannedFor: week.entries[0].plannedFor,
        recipeId: "recipe-1",
        servings: 2,
        weekStartDate: week.weekStartDate
      })
    );
    await waitFor(() =>
      expect(mocks.removeEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entryId: "entry-1" })
      )
    );
    expect(screen.queryByRole("dialog", { name: "Edit meal" })).not.toBeInTheDocument();
    const mondaySection = screen.getByRole("region", { name: /^Monday / });
    await waitFor(() =>
      expect(within(mondaySection).getByRole("button", {
        name: /^Add meal to Monday/
      })).toHaveFocus()
    );
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

  it("keeps edit-sheet removal errors out of the global week alert", async () => {
    mocks.removeError = new Error("remove failed");
    render(<MealPlanner />);
    await screen.findByRole("heading", { name: "Meal planner" });
    expect(screen.getByText("We could not remove that meal. Please try again.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Edit Berry overnight oats on Monday"
    }));

    expect(screen.queryByText(
      "We could not remove that meal. Please try again."
    )).not.toBeInTheDocument();
    const dialog = screen.getByRole("dialog", { name: "Edit meal" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "We could not remove this meal. Please try again."
    );
  });
});
