import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchivedRecipeLibrary } from "../ArchivedRecipeLibrary";

const mocks = vi.hoisted(() => ({
  deleteMutateAsync: vi.fn(),
  deleteReset: vi.fn(),
  restoreMutate: vi.fn(),
  useArchivedRecipeList: vi.fn(),
  useDeleteArchivedRecipes: vi.fn(),
  useRestoreRecipe: vi.fn()
}));

vi.mock("../recipe.queries", () => ({
  useArchivedRecipeList: mocks.useArchivedRecipeList,
  useDeleteArchivedRecipes: mocks.useDeleteArchivedRecipes,
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
    mutate: mocks.restoreMutate,
    variables: undefined,
    ...overrides
  });
}

function setDeleteMutation(
  overrides: Partial<{ error: Error | null; isPending: boolean }> = {}
) {
  mocks.useDeleteArchivedRecipes.mockReturnValue({
    error: null,
    isPending: false,
    mutateAsync: mocks.deleteMutateAsync,
    reset: mocks.deleteReset,
    ...overrides
  });
}

describe("ArchivedRecipeLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMutateAsync.mockResolvedValue(undefined);
    setArchivedQuery();
    setDeleteMutation();
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
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("renders archived cards without active recipe links and starts a restore", () => {
    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("heading", { name: "Archived noodles" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Archived noodles" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore Archived noodles" }));

    expect(mocks.restoreMutate).toHaveBeenCalledWith("recipe-1", expect.objectContaining({ onSuccess: expect.any(Function) }));
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
    expect(mocks.restoreMutate).not.toHaveBeenCalled();
  });

  it("keeps cards visible and shows a safe restore error", () => {
    setRestoreMutation({ error: new Error("internal database details") });

    render(<ArchivedRecipeLibrary />);

    expect(screen.getByRole("heading", { name: "Archived noodles" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("We could not restore this recipe. Please try again.");
    expect(screen.queryByText("internal database details")).not.toBeInTheDocument();
  });

  it("selects individual recipes and cancels permanent deletion", () => {
    render(<ArchivedRecipeLibrary />);

    const deleteButton = screen.getByRole("button", { name: "Delete selected" });
    expect(deleteButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Archived noodles" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected (1)" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Permanently delete 1 recipe?");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Archived noodles");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.deleteMutateAsync).not.toHaveBeenCalled();
  });

  it("selects all archived recipes and permanently deletes the selection", async () => {
    render(<ArchivedRecipeLibrary />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getAllByRole("checkbox").every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Delete selected (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => {
      expect(mocks.deleteMutateAsync).toHaveBeenCalledWith(["recipe-1", "recipe-2"]);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a safe deletion failure inside the confirmation dialog", () => {
    setDeleteMutation({ error: new Error("private database details") });
    render(<ArchivedRecipeLibrary />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Archived soup" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected (1)" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not permanently delete the selected recipes. Please try again."
    );
    expect(screen.queryByText("private database details")).not.toBeInTheDocument();
  });
});
