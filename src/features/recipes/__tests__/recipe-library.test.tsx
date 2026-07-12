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
  it("opens the filter dialog from the bottom navigation filter button", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Meal type" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Breakfast" })).toBeInTheDocument();
  });

  it("keeps meal chips visible without duplicating the popup filter button at the top", () => {
    renderRecipeLibrary();

    expect(screen.getByLabelText("Meal type filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Breakfast" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument();
  });
});
