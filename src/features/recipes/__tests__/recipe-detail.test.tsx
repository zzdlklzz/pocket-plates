import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeDetail } from "../RecipeDetail";

const mocks = vi.hoisted(() => ({
  useArchiveRecipe: vi.fn(),
  useRecipeDetail: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("../recipe.queries", () => ({
  useArchiveRecipe: mocks.useArchiveRecipe,
  useRecipeDetail: mocks.useRecipeDetail
}));

function recipeWithEffort(effortLabels: ("quick" | "make_ahead" | "one_pot" | "low_cleanup")[]) {
  return {
    id: "recipe-1",
    title: "Rice bowl",
    costRating: "cheap" as const,
    difficulty: "easy" as const,
    effortLabels,
    imageStoragePath: null,
    imageUrl: null,
    ingredients: [{ amount: 1, name: "Rice", notes: null, unit: "cup" }],
    mealTypes: ["dinner" as const],
    notes: null,
    servings: 2,
    sourceLinks: [],
    steps: [{ instruction: "Cook the rice." }]
  };
}

describe("RecipeDetail", () => {
  it("shows saved effort labels in application order", () => {
    mocks.useRecipeDetail.mockReturnValue({
      data: recipeWithEffort(["quick", "low_cleanup"]),
      error: null,
      isLoading: false
    });
    mocks.useArchiveRecipe.mockReturnValue({ error: null, isPending: false, mutateAsync: vi.fn() });

    render(<RecipeDetail id="recipe-1" />);

    const heading = screen.getByRole("heading", { name: "At a glance" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveTextContent("QuickLow cleanup");
  });

  it("omits the effort section when no labels are recorded", () => {
    mocks.useRecipeDetail.mockReturnValue({
      data: recipeWithEffort([]),
      error: null,
      isLoading: false
    });
    mocks.useArchiveRecipe.mockReturnValue({ error: null, isPending: false, mutateAsync: vi.fn() });

    render(<RecipeDetail id="recipe-1" />);

    expect(screen.queryByRole("heading", { name: "At a glance" })).not.toBeInTheDocument();
  });
});
