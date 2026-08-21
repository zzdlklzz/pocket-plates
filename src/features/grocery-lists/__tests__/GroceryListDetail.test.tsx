import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroceryListDetailDto } from "../grocery-list.types";

const mocks = vi.hoisted(() => ({
  add: {} as Record<string, unknown>,
  check: {} as Record<string, unknown>,
  deleteList: {} as Record<string, unknown>,
  detailResult: {} as Record<string, unknown>,
  remove: {} as Record<string, unknown>,
  refresh: {} as Record<string, unknown>,
  rename: {} as Record<string, unknown>,
  resetChecklist: {} as Record<string, unknown>,
  routerPush: vi.fn(),
  update: {} as Record<string, unknown>
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush })
}));
vi.mock("../grocery-list.queries", () => ({
  useAddGroceryListItem: () => mocks.add,
  useDeleteGroceryList: () => mocks.deleteList,
  useGroceryListDetail: () => mocks.detailResult,
  useRemoveGroceryListItem: () => mocks.remove,
  useRenameGroceryList: () => mocks.rename,
  useResetGroceryListChecklist: () => mocks.resetChecklist,
  useRefreshGroceryListFromWeek: () => mocks.refresh,
  useSetGroceryListItemChecked: () => mocks.check,
  useUpdateGroceryListItem: () => mocks.update
}));

import { GroceryListDetail } from "../GroceryListDetail";

function mutation() {
  return {
    error: null,
    isError: false,
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    variables: undefined
  };
}

function deferredMutation() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function detail(): GroceryListDetailDto {
  return {
    id: "list-1",
    items: [
      {
        amount: 2,
        checked: false,
        id: "item-rice",
        isManual: true,
        name: "Rice",
        notes: "Jasmine",
        quantityOverridden: false,
        requirementGroups: [],
        sources: [],
        unit: "cups"
      },
      {
        amount: null,
        checked: false,
        id: "item-pepper",
        isManual: false,
        name: "Pepper",
        notes: null,
        quantityOverridden: false,
        requirementGroups: [
          {
            amount: 1,
            contributionCount: 1,
            displayUnit: "tbsp",
            key: "tbsp",
            kind: "measured",
            sourceCount: 1
          },
          {
            amount: null,
            contributionCount: 1,
            displayUnit: null,
            key: "extra",
            kind: "extra",
            sourceCount: 1
          }
        ],
        sources: [
          {
            canonicalUnit: "tbsp",
            contributedAmount: 1,
            id: "source-1",
            original: {
              amount: 1,
              name: "Pepper",
              notes: "ground",
              unit: "tbsp"
            },
            recipeId: "recipe-1",
            recipeIngredientId: "ingredient-1",
            recipeTitle: "Pepper noodles",
            savedServings: 4,
            scaleFactor: 1,
            sortOrder: 0,
            targetServings: 4
          }
        ],
        unit: null
      },
      {
        amount: 12,
        checked: true,
        id: "item-eggs",
        isManual: true,
        name: "Eggs",
        notes: null,
        quantityOverridden: false,
        requirementGroups: [],
        sources: [],
        unit: "pcs"
      }
    ],
    mealPlanAvailable: false,
    sourceRecipeCount: 0,
    sourceType: "manual",
    sourceWeekStartDate: null,
    title: "Weekend shop"
  };
}

describe("GroceryListDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.add = mutation();
    mocks.check = mutation();
    mocks.deleteList = mutation();
    mocks.remove = mutation();
    mocks.refresh = mutation();
    mocks.rename = mutation();
    mocks.resetChecklist = mutation();
    mocks.update = mutation();
    mocks.detailResult = {
      data: detail(),
      isError: false,
      isPending: false
    };
  });

  it("renders one shared manual checklist without a week refresh action", () => {
    render(<GroceryListDetail id="list-1" />);

    expect(screen.getByRole("heading", { name: "Weekend shop" })).toBeInTheDocument();
    expect(screen.getByText("Manual list")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Refresh from week/ })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mark Rice as bought" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Rice" })).toBeInTheDocument();
    expect(screen.getByText("2 cups")).toBeInTheDocument();
    expect(screen.queryByText("Eggs")).not.toBeInTheDocument();
    expect(screen.getByText("1 tbsp + extra")).toBeInTheDocument();
    expect(screen.getByText("Recipe requirements")).toBeInTheDocument();
    expect(screen.getByText("1 recipe gave no quantity")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completed (1)" }));
    expect(screen.getByText("Eggs")).toBeInTheDocument();
  });

  it("shows the frozen recipe count on a selected-recipe detail", () => {
    const selectedRecipeDetail = detail();
    selectedRecipeDetail.sourceRecipeCount = 1;
    selectedRecipeDetail.sourceType = "recipes";
    mocks.detailResult = {
      data: selectedRecipeDetail,
      isError: false,
      isPending: false
    };

    render(<GroceryListDetail id="list-1" />);

    expect(within(screen.getByRole("banner")).getByText("1 recipe")).toBeInTheDocument();
    expect(screen.queryByText("Recipe snapshot")).not.toBeInTheDocument();
  });

  it("refreshes an available meal-plan list from the existing detail page", async () => {
    const mealPlanDetail = detail();
    mealPlanDetail.mealPlanAvailable = true;
    mealPlanDetail.sourceType = "meal_plan";
    mealPlanDetail.sourceWeekStartDate = "2026-08-17";
    mocks.detailResult = {
      data: mealPlanDetail,
      isError: false,
      isPending: false
    };

    render(<GroceryListDetail id="list-1" />);

    expect(screen.getByText(/Meal plan ·/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh from week" }));

    await waitFor(() => {
      expect(mocks.refresh.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1"
      });
    });
    expect(screen.getByText(/Grocery list refreshed from/)).toHaveTextContent(
      /Grocery list refreshed from/
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows refresh pending and failure states without hiding list editing", async () => {
    const mealPlanDetail = detail();
    mealPlanDetail.mealPlanAvailable = true;
    mealPlanDetail.sourceType = "meal_plan";
    mealPlanDetail.sourceWeekStartDate = "2026-08-17";
    mocks.detailResult = {
      data: mealPlanDetail,
      isError: false,
      isPending: false
    };
    mocks.refresh = {
      ...mutation(),
      isPending: true
    };

    const view = render(<GroceryListDetail id="list-1" />);

    expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled();

    mocks.refresh = {
      ...mutation(),
      error: new TypeError("Failed to fetch"),
      isError: true,
      mutateAsync: vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    };
    view.rerender(<GroceryListDetail id="list-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your connection and try again."
    );
    expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled();
  });

  it("keeps an unavailable week list editable without a refresh action", () => {
    const mealPlanDetail = detail();
    mealPlanDetail.sourceType = "meal_plan";
    mealPlanDetail.sourceWeekStartDate = "2026-08-17";
    mocks.detailResult = {
      data: mealPlanDetail,
      isError: false,
      isPending: false
    };

    render(<GroceryListDetail id="list-1" />);

    expect(screen.getByText(/Week unavailable ·/)).toBeInTheDocument();
    expect(screen.getByText(/saved list stays editable/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Refresh from week/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled();
  });

  it("falls back safely when an older selected-recipe payload has no count", () => {
    const selectedRecipeDetail = detail();
    selectedRecipeDetail.sourceRecipeCount = undefined as unknown as number;
    selectedRecipeDetail.sourceType = "recipes";
    mocks.detailResult = {
      data: selectedRecipeDetail,
      isError: false,
      isPending: false
    };

    render(<GroceryListDetail id="list-1" />);

    expect(within(screen.getByRole("banner")).getByText("Recipe snapshot")).toBeInTheDocument();
    expect(screen.queryByText("undefined recipes")).not.toBeInTheDocument();
  });

  it("adds and edits an item through the shared sheet", async () => {
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    const addDialog = screen.getByRole("dialog", { name: "Add item" });
    fireEvent.change(within(addDialog).getByRole("textbox", { name: "Item" }), {
      target: { value: "Milk" }
    });
    fireEvent.change(within(addDialog).getByRole("textbox", { name: "Amount" }), {
      target: { value: "2" }
    });
    fireEvent.change(within(addDialog).getByRole("textbox", { name: "Unit" }), {
      target: { value: "bottles" }
    });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Add item" }));

    await waitFor(() => {
      expect(mocks.add.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1",
        values: { amount: "2", name: "Milk", notes: "", unit: "bottles" }
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Rice" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit Rice" });
    fireEvent.change(within(editDialog).getByRole("textbox", { name: "Note" }), {
      target: { value: "Basmati" }
    });
    fireEvent.click(within(editDialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1",
        itemId: "item-rice",
        quantityOverridden: false,
        values: { amount: "2", name: "Rice", notes: "Basmati", unit: "cups" }
      });
    });
  });

  it("saves and resets generated-item overrides without replacing sources", async () => {
    const currentDetail = detail();
    const pepper = currentDetail.items.find(({ id }) => id === "item-pepper")!;
    const originalSources = structuredClone(pepper.sources);
    mocks.detailResult = { data: currentDetail, isError: false, isPending: false };
    const view = render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Pepper" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Set a practical shopping amount" })
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Unit" }), {
      target: { value: "jar" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.update.mutateAsync).toHaveBeenLastCalledWith({
        groceryListId: "list-1",
        itemId: "item-pepper",
        quantityOverridden: true,
        values: {
          amount: "1",
          name: "Pepper",
          notes: "",
          unit: "jar"
        }
      });
    });
    expect(pepper.sources).toEqual(originalSources);

    pepper.amount = 1;
    pepper.quantityOverridden = true;
    pepper.unit = "jar";
    view.rerender(<GroceryListDetail id="list-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Pepper" }));
    fireEvent.click(screen.getByRole("button", { name: "Use recipe requirements" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.update.mutateAsync).toHaveBeenLastCalledWith({
        groceryListId: "list-1",
        itemId: "item-pepper",
        quantityOverridden: false,
        values: { amount: "", name: "Pepper", notes: "", unit: "" }
      });
    });
    expect(pepper.sources).toEqual(originalSources);
    expect(screen.getByText("Pepper noodles · ground")).toBeInTheDocument();
  });

  it("checks an item with a distinct control and announces the move", async () => {
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Rice as bought" }));

    await waitFor(() => {
      expect(mocks.check.mutateAsync).toHaveBeenCalledWith({
        checked: true,
        groceryListId: "list-1",
        itemId: "item-rice"
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Rice moved to Completed.");
  });

  it("resets completed items from the list actions without a confirmation flow", async () => {
    render(<GroceryListDetail id="list-1" />);

    const actionsTrigger = screen.getByRole("button", { name: "List actions" });
    actionsTrigger.focus();
    fireEvent.click(actionsTrigger);
    fireEvent.click(screen.getByRole("button", { name: "Reset checklist" }));

    await waitFor(() => {
      expect(mocks.resetChecklist.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1"
      });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checklist reset. 1 item moved to To buy."
    );
    expect(actionsTrigger).toHaveFocus();
  });

  it("hides checklist reset when nothing is completed", () => {
    const uncheckedDetail = detail();
    uncheckedDetail.items = uncheckedDetail.items.map((item) => ({
      ...item,
      checked: false
    }));
    mocks.detailResult = {
      data: uncheckedDetail,
      isError: false,
      isPending: false
    };
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "List actions" }));

    expect(
      screen.queryByRole("button", { name: "Reset checklist" })
    ).not.toBeInTheDocument();
  });

  it("keeps the list usable and shows a safe checklist reset error", async () => {
    mocks.resetChecklist = {
      ...mutation(),
      error: new TypeError("Failed to fetch"),
      isError: true,
      mutateAsync: vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    };
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "List actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset checklist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your connection and try again."
    );
    expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled();
  });

  it("shows a failed checkbox save even when the mutation observer resets", async () => {
    mocks.check = {
      ...mutation(),
      mutateAsync: vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    };
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Rice as bought" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your connection and try again."
    );
  });

  it("keeps every affected checkbox disabled until its own save settles", async () => {
    const riceCheck = deferredMutation();
    const pepperCheck = deferredMutation();
    mocks.check = {
      ...mutation(),
      mutateAsync: vi.fn(({ itemId }: { itemId: string }) =>
        itemId === "item-rice" ? riceCheck.promise : pepperCheck.promise
      )
    };
    render(<GroceryListDetail id="list-1" />);
    const rice = screen.getByRole("checkbox", { name: "Mark Rice as bought" });
    const pepper = screen.getByRole("checkbox", { name: "Mark Pepper as bought" });

    fireEvent.click(rice);
    await waitFor(() => expect(rice).toBeDisabled());
    expect(pepper).toBeEnabled();

    fireEvent.click(pepper);
    await waitFor(() => {
      expect(rice).toBeDisabled();
      expect(pepper).toBeDisabled();
    });

    await act(async () => {
      riceCheck.resolve();
      await riceCheck.promise;
    });
    await waitFor(() => expect(rice).toBeEnabled());
    expect(pepper).toBeDisabled();

    await act(async () => {
      pepperCheck.resolve();
      await pepperCheck.promise;
    });
    await waitFor(() => expect(pepper).toBeEnabled());
  });

  it("renames and deliberately deletes the list", async () => {
    render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "List actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename list" }));
    const renameDialog = screen.getByRole("dialog", { name: "Rename grocery list" });
    const renameInput = within(renameDialog).getByRole("textbox", { name: "List title" });
    expect(renameInput).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(within(renameDialog).getByRole("button", { name: "Save" })).toHaveFocus();
    fireEvent.change(within(renameDialog).getByRole("textbox", { name: "List title" }), {
      target: { value: "Weekly shop" }
    });
    fireEvent.click(within(renameDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mocks.rename.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1",
        title: "Weekly shop"
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "List actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    const deleteDialog = screen.getByRole("alertdialog", {
      name: "Delete “Weekend shop”?"
    });
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete list" }));

    await waitFor(() => {
      expect(mocks.deleteList.mutateAsync).toHaveBeenCalledWith({
        groceryListId: "list-1"
      });
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/grocery-lists");
  });

  it("dismisses the ordinary actions popover with Escape or an outside press", () => {
    render(<GroceryListDetail id="list-1" />);
    const trigger = screen.getByRole("button", { name: "List actions" });
    trigger.focus();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Rename list" })).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Rename list" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Rename list" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("button", { name: "Rename list" })).not.toBeInTheDocument();
  });

  it("traps focus in delete confirmation and restores the actions trigger", () => {
    render(<GroceryListDetail id="list-1" />);
    const actionsTrigger = screen.getByRole("button", { name: "List actions" });

    fireEvent.click(actionsTrigger);
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Delete “Weekend shop”?"
    });
    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
    const deleteButton = within(dialog).getByRole("button", { name: "Delete list" });
    expect(cancelButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(deleteButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(actionsTrigger).toHaveFocus();
  });

  it("focuses a stable action after the first-add trigger is replaced", async () => {
    const emptyList = { ...detail(), items: [] };
    const populatedList = {
      ...emptyList,
      items: [detail().items[0]!]
    };
    const pendingAdd = deferredMutation();
    mocks.detailResult = { data: emptyList, isError: false, isPending: false };
    mocks.add = {
      ...mutation(),
      mutateAsync: vi.fn(() => pendingAdd.promise)
    };
    const view = render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    const dialog = screen.getByRole("dialog", { name: "Add item" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Item" }), {
      target: { value: "Rice" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(mocks.add.mutateAsync).toHaveBeenCalledOnce());

    mocks.detailResult = { data: populatedList, isError: false, isPending: false };
    view.rerender(<GroceryListDetail id="list-1" />);
    await act(async () => {
      pendingAdd.resolve();
      await pendingAdd.promise;
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add item" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "List actions" })).toHaveFocus();
  });

  it("focuses a stable action after removing the edited item", async () => {
    const pendingRemove = deferredMutation();
    mocks.remove = {
      ...mutation(),
      mutateAsync: vi.fn(() => pendingRemove.promise)
    };
    const view = render(<GroceryListDetail id="list-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Rice" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Rice" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove item" }));
    await waitFor(() => expect(mocks.remove.mutateAsync).toHaveBeenCalledOnce());

    const withoutRice = {
      ...detail(),
      items: detail().items.filter(({ id }) => id !== "item-rice")
    };
    mocks.detailResult = { data: withoutRice, isError: false, isPending: false };
    view.rerender(<GroceryListDetail id="list-1" />);
    await act(async () => {
      pendingRemove.resolve();
      await pendingRemove.promise;
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit Rice" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "List actions" })).toHaveFocus();
  });

  it("renders a generic unavailable state", () => {
    mocks.detailResult = { data: null, isError: false, isPending: false };
    render(<GroceryListDetail id="missing" />);

    expect(screen.getByText("We could not find this grocery list.")).toBeInTheDocument();
  });
});
