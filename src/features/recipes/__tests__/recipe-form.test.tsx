import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "../recipe-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({})
}));

function renderRecipeForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeForm />
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
    const ingredientNames = ingredients.getAllByPlaceholderText("Ingredient");
    expect(ingredientNames).toHaveLength(2);
    expect(ingredientNames[1]).toHaveFocus();
    fireEvent.click(ingredients.getAllByRole("button", { name: "Remove" })[0]);
    expect(ingredients.getAllByPlaceholderText("Ingredient")).toHaveLength(1);

    const steps = getSection("Steps");
    fireEvent.click(steps.getByRole("button", { name: "Add step" }));
    const secondStep = steps.getByPlaceholderText("Step 2");
    expect(secondStep).toHaveFocus();
    fireEvent.click(steps.getAllByRole("button", { name: "Remove" })[0]);
    expect(steps.queryByPlaceholderText("Step 2")).not.toBeInTheDocument();
  });

  it("reorders ingredients with accessible move controls", () => {
    renderRecipeForm();

    const ingredients = getSection("Ingredients");
    const firstIngredient = ingredients.getByPlaceholderText("Ingredient");
    fireEvent.change(firstIngredient, { target: { value: "Rice" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Add ingredient" }));

    const ingredientNames = ingredients.getAllByPlaceholderText("Ingredient");
    fireEvent.change(ingredientNames[1], { target: { value: "Egg" } });
    fireEvent.click(ingredients.getByRole("button", { name: "Move ingredient 2 up" }));

    expect(ingredients.getAllByPlaceholderText("Ingredient").map((input) => (input as HTMLInputElement).value)).toEqual(["Egg", "Rice"]);
    expect(ingredients.getByRole("button", { name: "Move ingredient 1 up" })).toBeDisabled();
    expect(ingredients.getByRole("button", { name: "Move ingredient 2 down" })).toBeDisabled();
  });
});
