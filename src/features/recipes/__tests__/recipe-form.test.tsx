import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "../recipe-form";
import type { RecipeFormValues } from "../recipe.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({})
}));

function renderRecipeForm(initialValues?: RecipeFormValues) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeForm initialValues={initialValues} recipeId={initialValues ? "recipe-1" : undefined} />
    </QueryClientProvider>
  );
}

function getSection(name: string) {
  const heading = screen.getByRole("heading", { name });
  const section = heading.closest("section");

  if (!section) {
    throw new Error(`Could not find the ${name} section.`);
  }

  return within(section);
}

describe("RecipeForm", () => {
  it("constrains the form fieldset to the mobile page width", () => {
    const { container } = renderRecipeForm();

    expect(container.querySelector("fieldset")).toHaveClass("min-w-0", "w-full");
  });

  it("adds and removes dynamic source, ingredient, and step rows", () => {
    renderRecipeForm();

    const sources = getSection("Sources");
    fireEvent.click(sources.getByRole("button", { name: "Add source" }));
    const sourceUrl = sources.getByPlaceholderText("https://example.com/recipe");
    expect(sourceUrl).toHaveFocus();
    fireEvent.click(sources.getByRole("button", { name: "Remove" }));
    expect(sources.queryByPlaceholderText("https://example.com/recipe")).not.toBeInTheDocument();

    const ingredients = getSection("Ingredients");
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveFocus();
    expect(ingredients.getByRole("heading", { name: "Ingredients" })).toHaveTextContent("Ingredients · 2");
    fireEvent.click(ingredients.getByRole("button", { name: "Ingredient 2 actions" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Remove ingredient 2" }));
    expect(ingredients.getByRole("heading", { name: "Ingredients" })).toHaveTextContent("Ingredients · 1");

    const steps = getSection("Steps");
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    const secondStep = steps.getByPlaceholderText("Step 2");
    expect(secondStep).toHaveFocus();
    expect(steps.getByRole("heading", { name: "Steps" })).toHaveTextContent("Steps · 2");
    fireEvent.click(steps.getByRole("button", { name: "Remove step 2" }));
    expect(steps.queryByPlaceholderText("Step 2")).not.toBeInTheDocument();
    expect(steps.getByRole("heading", { name: "Steps" })).toHaveTextContent("Steps · 1");
  });

  it("restores removed repeating rows at their original positions", () => {
    renderRecipeForm();

    const sources = getSection("Sources");
    fireEvent.click(sources.getByRole("button", { name: "Add source" }));
    fireEvent.change(sources.getByPlaceholderText("https://example.com/recipe"), {
      target: { value: "https://example.com/rice" }
    });
    fireEvent.click(sources.getByRole("button", { name: "Remove" }));
    fireEvent.click(sources.getByRole("button", { name: "Undo" }));
    expect(sources.getByPlaceholderText("https://example.com/recipe")).toHaveValue("https://example.com/rice");

    const ingredients = getSection("Ingredients");
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Rice" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Egg" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Ingredient 1 actions" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Remove ingredient 1" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Undo" }));
    expect(ingredients.getAllByRole("button", { name: /Edit ingredient/ }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Edit ingredient 1: Rice",
      "Edit ingredient 2: Egg"
    ]);

    const steps = getSection("Steps");
    fireEvent.change(steps.getByPlaceholderText("Step 1"), { target: { value: "Cook rice." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    fireEvent.change(steps.getByPlaceholderText("Step 2"), { target: { value: "Serve." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));
    fireEvent.click(steps.getByRole("button", { name: "Remove step 1" }));
    fireEvent.click(steps.getByRole("button", { name: "Undo" }));
    expect(steps.getByRole("button", { name: "Edit step 1: Cook rice." })).toBeInTheDocument();
    expect(steps.getByRole("button", { name: "Edit step 2: Serve." })).toBeInTheDocument();
  });

  it("reorders ingredients with accessible move controls", () => {
    renderRecipeForm();

    const ingredients = getSection("Ingredients");
    const firstIngredient = ingredients.getByPlaceholderText("Ingredient");
    fireEvent.change(firstIngredient, { target: { value: "Rice" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));

    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Egg" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Ingredient 2 actions" }));
    fireEvent.click(ingredients.getByRole("button", { name: "Move ingredient 2 up" }));

    expect(ingredients.getAllByRole("button", { name: /Edit ingredient/ }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Edit ingredient 1: Egg",
      "Edit ingredient 2: Rice"
    ]);
    fireEvent.click(ingredients.getByRole("button", { name: "Ingredient 1 actions" }));
    expect(ingredients.getByRole("button", { name: "Move ingredient 1 up" })).toBeDisabled();
  });

  it("collapses completed rows and reopens them for editing", () => {
    renderRecipeForm();

    const ingredients = getSection("Ingredients");
    fireEvent.change(ingredients.getByPlaceholderText("Ingredient"), { target: { value: "Rice" } });
    fireEvent.change(ingredients.getByPlaceholderText("Amount"), { target: { value: "2" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Done" }));

    expect(ingredients.queryByPlaceholderText("Ingredient")).not.toBeInTheDocument();
    fireEvent.click(ingredients.getByRole("button", { name: "Edit ingredient 1: 2 Rice" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveValue("Rice");

    const steps = getSection("Steps");
    fireEvent.change(steps.getByPlaceholderText("Step 1"), { target: { value: "Cook the rice." } });
    fireEvent.click(steps.getByRole("button", { name: "Done" }));

    expect(steps.queryByPlaceholderText("Step 1")).not.toBeInTheDocument();
    fireEvent.click(steps.getByRole("button", { name: "Edit step 1: Cook the rice." }));
    expect(steps.getByPlaceholderText("Step 1")).toHaveValue("Cook the rice.");
  });

  it("renders saved ingredients and steps as editable compact rows", () => {
    const initialValues: RecipeFormValues = {
      title: "Egg fried rice",
      servings: 2,
      mealTypes: ["dinner"],
      costRating: "cheap",
      difficulty: "easy",
      imageUrl: "",
      sourceLinks: [],
      notes: "",
      ingredients: [
        { name: "Rice", amount: "2", unit: "cups", notes: "cooked" },
        { name: "Egg", amount: "2", unit: "pcs", notes: "beaten" }
      ],
      steps: [
        { instruction: "Scramble the eggs." },
        { instruction: "Stir-fry the rice." }
      ]
    };

    renderRecipeForm(initialValues);

    expect(screen.getByRole("heading", { name: "Edit recipe" })).toBeInTheDocument();

    const ingredients = getSection("Ingredients");
    expect(ingredients.getByRole("button", { name: "Edit ingredient 1: 2 cups Rice · cooked" })).toBeInTheDocument();
    expect(ingredients.getByRole("button", { name: "Edit ingredient 2: 2 pcs Egg · beaten" })).toBeInTheDocument();
    fireEvent.click(ingredients.getByRole("button", { name: "Edit ingredient 2: 2 pcs Egg · beaten" }));
    expect(ingredients.getByPlaceholderText("Ingredient")).toHaveValue("Egg");

    const steps = getSection("Steps");
    expect(steps.getByRole("button", { name: "Edit step 1: Scramble the eggs." })).toBeInTheDocument();
    fireEvent.click(steps.getByRole("button", { name: "Edit step 2: Stir-fry the rice." }));
    expect(steps.getByPlaceholderText("Step 2")).toHaveValue("Stir-fry the rice.");
  });
});
