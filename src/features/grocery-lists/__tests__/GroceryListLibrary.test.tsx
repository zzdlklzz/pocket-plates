import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMutation: {} as Record<string, unknown>,
  listsResult: {} as Record<string, unknown>,
  routerPush: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush })
}));
vi.mock("../grocery-list.queries", () => ({
  useCreateBlankGroceryList: () => mocks.createMutation,
  useGroceryLists: () => mocks.listsResult
}));

import { GroceryListLibrary, NewGroceryList } from "../GroceryListLibrary";

describe("GroceryListLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutation = {
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue("list-new")
    };
    mocks.listsResult = {
      data: [],
      isError: false,
      isPending: false,
      refetch: vi.fn()
    };
  });

  it("shows the approved creation actions and empty state", () => {
    render(<GroceryListLibrary />);

    expect(screen.getByRole("heading", { name: "Grocery lists" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Generate from recipes" })[0]).toHaveAttribute(
      "href",
      "/grocery-lists/new?source=recipes"
    );
    expect(screen.getAllByRole("link", { name: "New blank list" })[0]).toHaveAttribute(
      "href",
      "/grocery-lists/new"
    );
    expect(screen.getByRole("heading", { name: "No grocery lists yet" })).toBeInTheDocument();
  });

  it("renders lightweight list cards with progress", () => {
    mocks.listsResult = {
      data: [
        {
          checkedItemCount: 2,
          id: "list-1",
          itemCount: 5,
          mealPlanAvailable: false,
          sourceType: "manual",
          sourceWeekStartDate: null,
          title: "Weekend shop",
          updatedAt: new Date().toISOString()
        }
      ],
      isError: false,
      isPending: false,
      refetch: vi.fn()
    };

    render(<GroceryListLibrary />);

    expect(screen.getByRole("link", { name: /Open Weekend shop/ })).toHaveAttribute(
      "href",
      "/grocery-lists/list-1"
    );
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText(/2 of 5 checked · Updated today/)).toBeInTheDocument();
  });

  it("labels a detached meal-plan snapshot as unavailable", () => {
    mocks.listsResult = {
      data: [
        {
          checkedItemCount: 0,
          id: "list-1",
          itemCount: 2,
          mealPlanAvailable: false,
          sourceType: "meal_plan",
          sourceWeekStartDate: "2026-08-17",
          title: "Old week",
          updatedAt: new Date().toISOString()
        }
      ],
      isError: false,
      isPending: false,
      refetch: vi.fn()
    };

    render(<GroceryListLibrary />);

    expect(screen.getByText(/Week unavailable ·/)).toBeInTheDocument();
    expect(screen.queryByText(/Meal plan ·/)).not.toBeInTheDocument();
  });

  it("offers a retry after a list error", () => {
    const refetch = vi.fn();
    mocks.listsResult = {
      data: undefined,
      isError: true,
      isPending: false,
      refetch
    };

    render(<GroceryListLibrary />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not load your grocery lists"
    );
    expect(refetch).toHaveBeenCalledOnce();
  });
});

describe("NewGroceryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutation = {
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue("list-new")
    };
  });

  it("shows a concise intermediate recipe-generation state", () => {
    render(<NewGroceryList source="recipes" />);

    expect(screen.getByRole("heading", { name: "Generate from recipes" })).toBeInTheDocument();
    expect(screen.getByText(/Recipe selection is coming/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a blank list instead" })).toHaveAttribute(
      "href",
      "/grocery-lists/new"
    );
  });

  it("creates a trimmed blank list and opens it", async () => {
    render(<NewGroceryList source="blank" />);

    fireEvent.change(screen.getByRole("textbox", { name: "List title" }), {
      target: { value: "  Weekend shop  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create grocery list" }));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        title: "Weekend shop"
      });
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/grocery-lists/list-new");
  });

  it("validates a blank title before mutation", () => {
    render(<NewGroceryList source="blank" />);

    fireEvent.change(screen.getByRole("textbox", { name: "List title" }), {
      target: { value: "  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create grocery list" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add a list title.");
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
