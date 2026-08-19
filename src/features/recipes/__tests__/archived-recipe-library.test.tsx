import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchivedRecipeLibrary } from "../archived-recipe-library";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useArchivedRecipeList: vi.fn(),
  useRestoreRecipe: vi.fn()
}));

vi.mock("../recipe.queries", () => ({
  useArchivedRecipeList: mocks.useArchivedRecipeList,
  useRestoreRecipe: mocks.useRestoreRecipe
}));

const archivedRecipes = [
  {
    costRating: "cheap" as const,
    difficulty: "easy" as const,
    id: "recipe-1",
    imageUrl: null,
    mealTypes: ["dinner" as const],
    title: "Archived noodles"
  },
  {
    costRating: null,
    difficulty: null,
    id: "recipe-2",
    imageUrl: null,
    mealTypes: [],
    title: "Archived soup"
  }
];

function setArchivedQuery(
  overrides: Partial<{ data: typeof archivedRecipes; error: Error | null; isLoading: boolean }> = {}
) {
  mocks.useArchivedRecipeList.mockReturnValue({
    data: archivedRecipes,
    error: null,
    isLoading: false,
    ...overrides
  });
}

function setRestoreMutation(
  overrides: Partial<{ error: Error | null; isPending: boolean; variables: string | undefined }> = {}
) {
  mocks.useRestoreRecipe.mockReturnValue({
    error: null,
    isPending: false,
    mutate: mocks.mutate,
    variables: undefined,
    ...overrides
  });
}

describe("ArchivedRecipeLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setArchivedQuery();
    setRestoreMutation();
  });

  it("shows the shared loading state", () => {
    setArchivedQuery({ data: [], isLoading: true });

    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("status", { name: "Loading archived recipes" })).toBeInTheDocument();
  });

  it("shows an empty explanation and routes back to the library", () => {
    setArchivedQuery({ data: [] });

    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("heading", { name: "No archived recipes" })).toBeInTheDocument();
    expect(screen.getByText("Recipes you archive will appear here until you restore them.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to library" })).toHaveAttribute("href", "/");
  });

  it("renders archived cards without active recipe links and starts a restore", () => {
    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("heading", { name: "Archived noodles" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Archived noodles" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore Archived noodles" }));

    expect(mocks.mutate).toHaveBeenCalledWith("recipe-1");
  });

  it("disables every restore while labelling only the current recipe as pending", () => {
    setRestoreMutation({ isPending: true, variables: "recipe-1" });

    render(<ArchivedRecipeLibrary />);

    const currentButton = screen.getByRole("button", { name: "Restore Archived noodles" });
    const otherButton = screen.getByRole("button", { name: "Restore Archived soup" });
    expect(currentButton).toBeDisabled();
    expect(currentButton).toHaveAttribute("aria-busy", "true");
    expect(otherButton).toBeDisabled();
    expect(otherButton).not.toHaveAttribute("aria-busy");
    expect(screen.getAllByText("Restoring...")).toHaveLength(1);

    fireEvent.click(otherButton);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("keeps cards visible and shows a safe restore error", () => {
    setRestoreMutation({ error: new Error("internal database details") });

    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("heading", { name: "Archived noodles" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("We could not restore this recipe. Please try again.");
    expect(screen.queryByText("internal database details")).not.toBeInTheDocument();
  });
});
