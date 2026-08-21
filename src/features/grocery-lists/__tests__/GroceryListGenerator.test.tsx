import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GeneratedGroceryListItem,
  GroceryListRecipeOptionDto,
  SelectedGroceryListRecipeInput
} from "../grocery-list.types";
import { GroceryListItemLimitError } from "../grocery-list.errors";

const mocks = vi.hoisted(() => ({
  createMutation: {} as Record<string, unknown>,
  optionsResult: {} as Record<string, unknown>,
  previewInputs: [] as SelectedGroceryListRecipeInput[],
  previewResult: {} as Record<string, unknown>,
  routerPush: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush })
}));
vi.mock("../grocery-list.queries", () => ({
  useCreateGeneratedGroceryList: () => mocks.createMutation,
  useGroceryListRecipeOptions: () => mocks.optionsResult,
  useSelectedRecipeGroceryPreview: (recipes: SelectedGroceryListRecipeInput[]) => {
    mocks.previewInputs = recipes;
    return mocks.previewResult;
  }
}));

import { GroceryListGenerator } from "../GroceryListGenerator";

function option(
  id: string,
  title: string,
  savedServings = 4
): GroceryListRecipeOptionDto {
  return {
    id,
    ingredientNames: ["Pepper"],
    savedServings,
    title
  };
}

function previewItem(): GeneratedGroceryListItem {
  return {
    name: "Pepper",
    normalizedName: "pepper",
    requirementGroups: [
      {
        amount: 2,
        contributionCount: 1,
        displayUnit: "tbsp",
        key: "tbsp",
        kind: "measured",
        sourceCount: 1
      },
      {
        amount: null,
        contributionCount: 1,
        displayUnit: null,
        key: "extra",
        kind: "extra",
        sourceCount: 1
      }
    ],
    sortOrder: 0,
    sources: [
      {
        canonicalUnit: "tbsp",
        contributedAmount: 2,
        ingredientSortOrder: 0,
        original: {
          amount: 2,
          name: "Pepper",
          notes: "ground",
          unit: "tbsp"
        },
        recipeId: "recipe-1",
        recipeIngredientId: "ingredient-1",
        recipeTitle: "Pepper noodles",
        savedServings: 4,
        scaleFactor: 1,
        selectedRecipeOrder: 0,
        sortOrder: 0,
        targetServings: 4
      }
    ]
  };
}

function renderGenerator(options = [option("recipe-1", "Pepper noodles")]) {
  mocks.optionsResult = {
    data: options,
    isError: false,
    isPending: false,
    refetch: vi.fn()
  };
  return render(<GroceryListGenerator />);
}

describe("GroceryListGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutation = {
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue("list-generated"),
      reset: vi.fn()
    };
    mocks.previewInputs = [];
    mocks.previewResult = {
      data: [previewItem()],
      error: null,
      isError: false,
      isFetching: false,
      refetch: vi.fn()
    };
  });

  it("adds a recipe once and defaults its target to the saved yield", async () => {
    renderGenerator();

    expect(
      (screen.getByRole("textbox", { name: "List title" }) as HTMLInputElement)
        .value
    ).toMatch(/^Groceries · /);
    const search = screen.getByRole("searchbox", { name: "Search recipes" });
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));

    expect(screen.getByText("Saved yield: 4 servings")).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", {
        name: "Target servings for Pepper noodles"
      })
    ).toHaveValue(4);
    expect(screen.getByText("1 of 10 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pepper noodlesServes 4Selected/ })
    ).toBeDisabled();
    await waitFor(() => expect(search).toHaveFocus());
  });

  it("reviews a grouped preview and invalidates it when servings change", () => {
    renderGenerator();
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    expect(mocks.previewInputs).toEqual([
      {
        recipeId: "recipe-1",
        selectedRecipeOrder: 0,
        targetServings: 4
      }
    ]);
    expect(screen.getByRole("heading", { name: "Shopping items" })).toBeInTheDocument();
    expect(screen.getByText("2 tbsp + extra")).toBeInTheDocument();
    expect(screen.getByText("From Pepper noodles")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Recipe requirements"));
    expect(screen.getByText("Pepper noodles · ground")).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Target servings for Pepper noodles"
      }),
      { target: { value: "6" } }
    );

    expect(screen.queryByRole("heading", { name: "Shopping items" })).not.toBeInTheDocument();
    expect(mocks.previewInputs).toEqual([]);
  });

  it("validates target servings before loading a preview", () => {
    renderGenerator();
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Target servings for Pepper noodles"
      }),
      { target: { value: "101" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Set Pepper noodles to a whole number from 1 to 100 servings."
    );
    expect(mocks.previewInputs).toEqual([]);
  });

  it("does not render or create from cached preview data after review fails", () => {
    mocks.previewResult = {
      data: [previewItem()],
      error: new Error("preview failed"),
      isError: true,
      isFetching: false,
      refetch: vi.fn()
    };
    renderGenerator();
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not create this grocery list"
    );
    expect(screen.queryByRole("heading", { name: "Shopping items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create grocery list" })).not.toBeInTheDocument();
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("explains how to recover when a preview exceeds 300 products", () => {
    mocks.previewResult = {
      data: undefined,
      error: new GroceryListItemLimitError(),
      isError: true,
      isFetching: false,
      refetch: vi.fn()
    };
    renderGenerator();
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This selection creates more than 300 grocery items. Remove a recipe or choose recipes with fewer ingredients."
    );
  });

  it("caps selection at ten recipes", () => {
    const options = Array.from({ length: 11 }, (_, index) =>
      option(`recipe-${index + 1}`, `Recipe ${index + 1}`)
    );
    renderGenerator(options);

    for (let index = 1; index <= 10; index += 1) {
      fireEvent.click(
        screen.getByRole("button", {
          name: new RegExp(`^Recipe ${index}Serves`)
        })
      );
    }

    expect(screen.getByText("10 of 10 selected")).toBeInTheDocument();
    const lastResult = screen.getByRole("button", { name: /Recipe 11/ });
    expect(lastResult).toBeDisabled();
    expect(within(lastResult).getByText("Limit reached")).toBeInTheDocument();
  });

  it("creates from the authoritative selection and navigates only on success", async () => {
    renderGenerator();
    fireEvent.click(screen.getByRole("button", { name: /Pepper noodles/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));
    fireEvent.change(screen.getByRole("textbox", { name: "List title" }), {
      target: { value: "  Weekend shop  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create grocery list" }));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        recipes: [
          {
            recipeId: "recipe-1",
            selectedRecipeOrder: 0,
            targetServings: 4
          }
        ],
        title: "Weekend shop"
      });
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/grocery-lists/list-generated");

    mocks.routerPush.mockClear();
    mocks.createMutation.mutateAsync = vi.fn().mockRejectedValue(new Error("failed"));
    fireEvent.click(screen.getByRole("button", { name: "Create grocery list" }));
    await waitFor(() => expect(mocks.createMutation.mutateAsync).toHaveBeenCalled());
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("supports recipe loading, empty, and retry states", () => {
    mocks.optionsResult = {
      data: undefined,
      isError: false,
      isPending: true,
      refetch: vi.fn()
    };
    const view = render(<GroceryListGenerator />);
    expect(screen.getByText("Loading recipes…")).toBeInTheDocument();

    const refetch = vi.fn();
    mocks.optionsResult = {
      data: undefined,
      isError: true,
      isPending: false,
      refetch
    };
    view.rerender(<GroceryListGenerator />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();

    mocks.optionsResult = {
      data: [],
      isError: false,
      isPending: false,
      refetch: vi.fn()
    };
    view.rerender(<GroceryListGenerator />);
    expect(screen.getByText("No active recipes are available yet.")).toBeInTheDocument();
  });
});
