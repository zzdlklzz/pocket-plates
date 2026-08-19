import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeLibrary } from "../recipe-library";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({})
}));

vi.mock("../recipe.repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../recipe.repository")>();

  return {
    ...actual,
    listRecipes: vi.fn().mockResolvedValue([])
  };
});

function renderRecipeLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeLibrary profileLabel="test@example.com" />
    </QueryClientProvider>
  );
}

describe("RecipeLibrary", () => {
  it("opens the filter dialog from the local library controls", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Meal type" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Breakfast" })).toBeInTheDocument();
  });

  it("keeps meal chips and the popup filter action together above the results", () => {
    renderRecipeLibrary();

    const mealTypeFilters = screen.getByLabelText("Meal type filters");
    expect(mealTypeFilters).toBeInTheDocument();
    fireEvent.click(within(mealTypeFilters).getByRole("button", { name: "Breakfast" }));
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument();
  });

  it("links to archived recipes from More without crowding the bottom bar", () => {
    renderRecipeLibrary();

    expect(screen.getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/recipes/new");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Archived recipes" })).toHaveAttribute("href", "/recipes/archived");
  });
});
