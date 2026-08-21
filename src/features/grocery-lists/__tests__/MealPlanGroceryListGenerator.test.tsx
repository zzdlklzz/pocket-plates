import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GeneratedGroceryListItem,
  MealPlanGrocerySourceDto
} from "../grocery-list.types";
import { GroceryListItemLimitError } from "../grocery-list.errors";

const mocks = vi.hoisted(() => ({
  createMutation: {} as Record<string, unknown>,
  requestedWeek: null as string | null,
  routerPush: vi.fn(),
  sourceResult: {} as Record<string, unknown>
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush })
}));
vi.mock("../grocery-list.queries", () => ({
  useCreateMealPlanGroceryList: () => mocks.createMutation,
  useMealPlanGrocerySource: (weekStartDate: string) => {
    mocks.requestedWeek = weekStartDate;
    return mocks.sourceResult;
  }
}));

import { MealPlanGroceryListGenerator } from "../MealPlanGroceryListGenerator";

function generatedItem(): GeneratedGroceryListItem {
  return {
    name: "Pepper",
    normalizedName: "pepper",
    requirementGroups: [
      {
        amount: 3,
        contributionCount: 2,
        displayUnit: "tbsp",
        key: "tbsp",
        kind: "measured",
        sourceCount: 2
      }
    ],
    sortOrder: 0,
    sources: [
      {
        canonicalUnit: "tbsp",
        contributedAmount: 2,
        ingredientSortOrder: 0,
        original: {
          amount: 1,
          name: "Pepper",
          notes: null,
          unit: "tbsp"
        },
        recipeId: "recipe-1",
        recipeIngredientId: "ingredient-1",
        recipeTitle: "Pepper noodles",
        savedServings: 4,
        scaleFactor: 2,
        selectedRecipeOrder: 0,
        sortOrder: 0,
        targetServings: 8
      },
      {
        canonicalUnit: "tbsp",
        contributedAmount: 1,
        ingredientSortOrder: 0,
        original: {
          amount: 1,
          name: " pepper ",
          notes: "ground",
          unit: "tbsp"
        },
        recipeId: "recipe-2",
        recipeIngredientId: "ingredient-2",
        recipeTitle: "Archived curry",
        savedServings: 2,
        scaleFactor: 1,
        selectedRecipeOrder: 1,
        sortOrder: 1,
        targetServings: 2
      }
    ]
  };
}

function source(): MealPlanGrocerySourceDto {
  return {
    generatedItems: [generatedItem()],
    mealPlanId: "plan-1",
    recipes: [
      {
        archived: false,
        plannedServings: 8,
        recipeId: "recipe-1",
        recipeTitle: "Pepper noodles",
        savedServings: 4,
        scaleLabel: "2×"
      },
      {
        archived: true,
        plannedServings: 2,
        recipeId: "recipe-2",
        recipeTitle: "Archived curry",
        savedServings: 2,
        scaleLabel: "1×"
      }
    ],
    weekStartDate: "2026-08-17"
  };
}

function loadedSource(data = source()) {
  const refetch = vi.fn().mockResolvedValue({
    data,
    error: null,
    isError: false
  });
  mocks.sourceResult = {
    data,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch
  };
  return refetch;
}

describe("MealPlanGroceryListGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadedSource();
    mocks.createMutation = {
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue("list-week"),
      reset: vi.fn()
    };
  });

  it("shows the exact week and every planned recipe including archived ones", () => {
    render(<MealPlanGroceryListGenerator weekStartDate="2026-08-17" />);

    expect(mocks.requestedWeek).toBe("2026-08-17");
    expect(screen.getByRole("textbox", { name: "List title" })).toHaveValue(
      "Groceries · 17–23 Aug 2026"
    );
    expect(screen.getByText(/Meal plan · 17–23 Aug/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planned recipes" })).toBeInTheDocument();
    expect(screen.getByText("Pepper noodles")).toBeInTheDocument();
    expect(screen.getByText("Archived curry")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("Saved yield: 4 · Planned: 8 · Scale 2×")).toBeInTheDocument();
    expect(screen.getByText("Saved yield: 2 · Planned: 2 · Scale 1×")).toBeInTheDocument();
  });

  it("refetches a fresh grouped preview and creates from the week", async () => {
    const refetch = loadedSource();
    render(<MealPlanGroceryListGenerator weekStartDate="2026-08-17" />);

    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(await screen.findByRole("heading", { name: "Shopping items" })).toBeInTheDocument();
    expect(screen.getAllByText("3 tbsp total")).not.toHaveLength(0);
    expect(screen.getByText("Used in 2 recipes")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "List title" }), {
      target: { value: "  Weekly shop  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create grocery list" }));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        title: "Weekly shop",
        weekStartDate: "2026-08-17"
      });
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/grocery-lists/list-week");
  });

  it("does not expose cached items after a fresh review fails", async () => {
    const reviewError = new TypeError("Failed to fetch");
    mocks.sourceResult = {
      data: source(),
      error: reviewError,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: vi.fn().mockResolvedValue({
        data: source(),
        error: reviewError,
        isError: true
      })
    };
    render(<MealPlanGroceryListGenerator weekStartDate="2026-08-17" />);

    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your connection and try again."
    );
    expect(
      screen.queryByRole("heading", { name: "Shopping items" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create grocery list" })
    ).not.toBeInTheDocument();
  });

  it("shows a simple planner return state for an empty or inaccessible week", () => {
    const empty = source();
    empty.generatedItems = [];
    empty.recipes = [];
    loadedSource(empty);

    render(<MealPlanGroceryListGenerator weekStartDate="2026-08-17" />);

    expect(
      screen.getByRole("heading", { name: "No grocery list for 17–23 Aug" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to meal planner" })).toHaveAttribute(
      "href",
      "/meal-planner?week=2026-08-17"
    );
    expect(screen.queryByRole("button", { name: "Review items" })).not.toBeInTheDocument();
  });

  it("renders loading and retry states accessibly", () => {
    mocks.sourceResult = {
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isPending: true,
      refetch: vi.fn()
    };
    const view = render(
      <MealPlanGroceryListGenerator weekStartDate="2026-08-17" />
    );
    expect(
      screen.getByRole("status", { name: "Loading grocery items for 17–23 Aug" })
    ).toBeInTheDocument();

    const refetch = vi.fn();
    mocks.sourceResult = {
      data: undefined,
      error: new GroceryListItemLimitError(
        "This week creates more than 300 grocery items. Reduce the planned meals and try again."
      ),
      isError: true,
      isFetching: false,
      isPending: false,
      refetch
    };
    view.rerender(<MealPlanGroceryListGenerator weekStartDate="2026-08-17" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This week creates more than 300 grocery items. Reduce the planned meals and try again."
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
