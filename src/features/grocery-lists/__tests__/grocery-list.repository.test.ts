import { describe, expect, it, vi } from "vitest";
import {
  DuplicateGroceryListItemError,
  GroceryListAuthenticationError,
  GroceryListNotFoundError
} from "../grocery-list.errors";
import {
  addGroceryListItem,
  createBlankGroceryList,
  deleteGroceryList,
  getGroceryListDetail,
  listGroceryLists,
  removeGroceryListItem,
  renameGroceryList,
  setGroceryListItemChecked,
  updateGroceryListItem
} from "../grocery-list.repository";

function createMutationClient(
  method: "delete" | "update",
  result: { data: { id: string } | null; error: unknown }
) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const chain = {
    eq: vi.fn(() => chain),
    maybeSingle,
    select: vi.fn(() => chain)
  };
  const mutate = vi.fn(() => chain);
  const from = vi.fn(() => ({ [method]: mutate }));

  return { client: { from } as never, chain, from, mutate };
}

describe("grocery list repository reads", () => {
  it("uses the summary RPC and maps its rows", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          checked_item_count: 1,
          id: "list-1",
          item_count: 3,
          meal_plan_available: false,
          source_type: "manual",
          source_week_start_date: null,
          title: "Groceries",
          updated_at: "2026-08-21T10:00:00Z"
        }
      ],
      error: null
    });

    await expect(listGroceryLists({ rpc } as never)).resolves.toEqual([
      expect.objectContaining({
        checkedItemCount: 1,
        id: "list-1",
        itemCount: 3,
        mealPlanAvailable: false
      })
    ]);
    expect(rpc).toHaveBeenCalledWith("list_grocery_lists");
  });

  it("returns null for missing or inaccessible detail rows", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await expect(
      getGroceryListDetail(
        { from } as never,
        "62000000-0000-0000-0000-000000000001"
      )
    ).resolves.toBeNull();
    expect(eq).toHaveBeenCalledWith(
      "id",
      "62000000-0000-0000-0000-000000000001"
    );
  });

  it("returns the same null detail without querying for malformed IDs", async () => {
    const from = vi.fn();

    await expect(
      getGroceryListDetail({ from } as never, "not-a-uuid")
    ).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("grocery list repository mutations", () => {
  it("derives the blank-list owner from the authenticated user", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "list-1" },
      error: null
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const auth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "owner-1" } },
        error: null
      })
    };

    await expect(
      createBlankGroceryList({ auth, from } as never, {
        title: "  Saturday shop  "
      })
    ).resolves.toBe("list-1");
    expect(insert).toHaveBeenCalledWith({
      owner_id: "owner-1",
      source_type: "manual",
      title: "Saturday shop"
    });
  });

  it("rejects blank creation without an authenticated user", async () => {
    await expect(
      createBlankGroceryList(
        {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null
            })
          }
        } as never,
        { title: "Groceries" }
      )
    ).rejects.toBeInstanceOf(GroceryListAuthenticationError);
  });

  it("appends a trimmed manual item after the current last item", async () => {
    const lastMaybeSingle = vi.fn().mockResolvedValue({
      data: { sort_order: 4 },
      error: null
    });
    const lastChain = {
      eq: vi.fn(() => lastChain),
      limit: vi.fn(() => lastChain),
      maybeSingle: lastMaybeSingle,
      order: vi.fn(() => lastChain)
    };
    const insertedSingle = vi.fn().mockResolvedValue({
      data: { id: "item-2" },
      error: null
    });
    const insertSelect = vi.fn(() => ({ single: insertedSingle }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => lastChain) })
      .mockReturnValueOnce({ insert });

    await expect(
      addGroceryListItem({ from } as never, {
        groceryListId: "list-1",
        values: {
          amount: "1/2",
          name: "  Pepper  ",
          notes: " ground ",
          unit: " tbsp "
        }
      })
    ).resolves.toBe("item-2");
    expect(insert).toHaveBeenCalledWith({
      amount: 0.5,
      grocery_list_id: "list-1",
      is_manual: true,
      name: "Pepper",
      notes: "ground",
      quantity_overridden: false,
      sort_order: 5,
      unit: "tbsp"
    });
  });

  it("maps normalized-name collisions to a focused duplicate error", async () => {
    const emptyLastChain = {
      eq: vi.fn(() => emptyLastChain),
      limit: vi.fn(() => emptyLastChain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn(() => emptyLastChain)
    };
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "database details" }
        })
      }))
    }));
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn(() => emptyLastChain) })
      .mockReturnValueOnce({ insert });

    await expect(
      addGroceryListItem({ from } as never, {
        groceryListId: "list-1",
        values: { amount: "", name: " pepper ", notes: "", unit: "" }
      })
    ).rejects.toBeInstanceOf(DuplicateGroceryListItemError);
  });

  it("updates editable item values and scopes the write to its parent list", async () => {
    const mutation = createMutationClient("update", {
      data: { id: "item-1" },
      error: null
    });

    await updateGroceryListItem(mutation.client, {
      groceryListId: "list-1",
      itemId: "item-1",
      quantityOverridden: true,
      values: { amount: "2", name: "Rice", notes: "long grain", unit: "bag" }
    });

    expect(mutation.mutate).toHaveBeenCalledWith({
      amount: 2,
      name: "Rice",
      notes: "long grain",
      quantity_overridden: true,
      unit: "bag"
    });
    expect(mutation.chain.eq).toHaveBeenNthCalledWith(1, "id", "item-1");
    expect(mutation.chain.eq).toHaveBeenNthCalledWith(
      2,
      "grocery_list_id",
      "list-1"
    );
  });

  it("returns the same safe not-found error for zero-row mutations", async () => {
    const mutation = createMutationClient("update", {
      data: null,
      error: null
    });

    await expect(
      renameGroceryList(mutation.client, {
        groceryListId: "list-missing",
        title: "New title"
      })
    ).rejects.toBeInstanceOf(GroceryListNotFoundError);
  });

  it("supports delete, check, and remove with bounded identifiers", async () => {
    const deleteListMutation = createMutationClient("delete", {
      data: { id: "list-1" },
      error: null
    });
    const checkMutation = createMutationClient("update", {
      data: { id: "item-1" },
      error: null
    });
    const removeMutation = createMutationClient("delete", {
      data: { id: "item-1" },
      error: null
    });

    await deleteGroceryList(deleteListMutation.client, {
      groceryListId: "list-1"
    });
    await setGroceryListItemChecked(checkMutation.client, {
      checked: true,
      groceryListId: "list-1",
      itemId: "item-1"
    });
    await removeGroceryListItem(removeMutation.client, {
      groceryListId: "list-1",
      itemId: "item-1"
    });

    expect(deleteListMutation.chain.eq).toHaveBeenCalledWith("id", "list-1");
    expect(checkMutation.mutate).toHaveBeenCalledWith({ checked: true });
    expect(checkMutation.chain.eq).toHaveBeenCalledWith(
      "grocery_list_id",
      "list-1"
    );
    expect(removeMutation.chain.eq).toHaveBeenCalledWith(
      "grocery_list_id",
      "list-1"
    );
  });
});
