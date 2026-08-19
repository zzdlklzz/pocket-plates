import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeLibrary } from "../RecipeLibrary";

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
    expect(screen.queryByRole("button", { name: /^Remove .* filter$/ })).not.toBeInTheDocument();
  });

  it("shows selected filters as wrapping removable chips", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Breakfast" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cheap" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    const filterToolbar = screen.getByLabelText("Recipe filters");
    expect(filterToolbar).toHaveClass("flex-wrap");
    expect(within(filterToolbar).getByRole("button", { name: "Filters, 2 active" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Breakfast filter" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Cheap filter" })).toBeInTheDocument();

    fireEvent.click(within(filterToolbar).getByRole("button", { name: "Remove Breakfast filter" }));
    expect(screen.queryByRole("button", { name: "Remove Breakfast filter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Cheap filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters, 1 active" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument();
  });

  it("clears every applied filter from the summary", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Dinner" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Easy" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.queryByRole("button", { name: /^Remove .* filter$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("clears meal types without clearing other dialog filters", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Breakfast" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cheap" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "All" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("button", { name: "Remove Breakfast filter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Cheap filter" })).toBeInTheDocument();
  });

  it("links to archived recipes from More without crowding the bottom bar", () => {
    renderRecipeLibrary();

    expect(screen.getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/recipes/new");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Archived recipes" })).toHaveAttribute("href", "/recipes/archived");
  });
});
