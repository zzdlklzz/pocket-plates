import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeLibrary } from "../RecipeLibrary";

const mocks = vi.hoisted(() => ({
  listRecipes: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({})
}));

vi.mock("../recipe.repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../recipe.repository")>();

  return {
    ...actual,
    listRecipes: mocks.listRecipes
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRecipes.mockResolvedValue([]);
  });

  it("searches titles or ingredients after normalizing and debouncing input", async () => {
    renderRecipeLibrary();

    await screen.findByText("No recipes yet");
    const search = screen.getByPlaceholderText("Search titles or ingredients");
    fireEvent.change(search, { target: { value: "  rice  " } });

    expect(screen.getByText("Updating recipes...")).toBeInTheDocument();
    await waitFor(
      () =>
        expect(mocks.listRecipes).toHaveBeenCalledWith(
          {},
          expect.objectContaining({ search: "rice" })
        ),
      { timeout: 1000 }
    );
  });

  it("distinguishes an empty library from an empty filtered result", async () => {
    renderRecipeLibrary();

    expect(await screen.findByText("No recipes yet")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search titles or ingredients"), {
      target: { value: "tofu" }
    });

    expect(await screen.findByText("No matching recipes", {}, { timeout: 1000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(await screen.findByText("No recipes yet", {}, { timeout: 1000 })).toBeInTheDocument();
  });

  it("opens the filter dialog from the local library controls", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Meal type" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Effort" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Equipment & setup" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Breakfast" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close filters" })).toHaveFocus();
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]", "overflow-hidden");
    expect(screen.queryByRole("button", { name: /^Remove .* filter$/ })).not.toBeInTheDocument();
  });

  it("shows selected filters as wrapping removable chips", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Breakfast" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cheap" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Quick" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Microwave" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    const filterToolbar = screen.getByLabelText("Recipe filters");
    expect(filterToolbar).toHaveClass("flex-wrap");
    expect(within(filterToolbar).getByRole("button", { name: "Filters, 4 active" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Meal type: Breakfast filter" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Cost: Cheap filter" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Effort: Quick filter" })).toBeInTheDocument();
    expect(within(filterToolbar).getByRole("button", { name: "Remove Equipment: Microwave filter" })).toBeInTheDocument();

    fireEvent.click(within(filterToolbar).getByRole("button", { name: "Remove Meal type: Breakfast filter" }));
    expect(screen.queryByRole("button", { name: "Remove Meal type: Breakfast filter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Cost: Cheap filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters, 3 active" })).toBeInTheDocument();
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

    expect(screen.queryByRole("button", { name: "Remove Meal type: Breakfast filter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Cost: Cheap filter" })).toBeInTheDocument();
  });

  it("closes filters on Escape and restores focus to the trigger", () => {
    renderRecipeLibrary();

    const trigger = screen.getByRole("button", { name: "Filters" });
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Close filters" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Recipe filters" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Oven and No oven needed mutually exclusive in filters", () => {
    renderRecipeLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Recipe filters" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Oven" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "No oven needed" }));

    expect(within(dialog).getByRole("button", { name: "Oven" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("button", { name: "No oven needed" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("links to archived recipes from More without crowding the bottom bar", () => {
    renderRecipeLibrary();

    expect(screen.getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/recipes/new");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Archived recipes" })).toHaveAttribute("href", "/recipes/archived");
  });
});
