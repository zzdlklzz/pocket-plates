import { describe, expect, it, vi } from "vitest";
import {
  DuplicateGroceryListItemError,
  GroceryListAuthenticationError,
  GroceryListItemLimitError,
  GroceryListMealPlanUnavailableError,
  GroceryListNotFoundError,
  GroceryListRecipeUnavailableError
} from "../grocery-list.errors";
import {
  addGroceryListItem,
  createBlankGroceryList,
  createGeneratedGroceryList,
  createMealPlanGroceryList,
  deleteGroceryList,
  getGroceryListDetail,
  getMealPlanGrocerySource,
  getSelectedRecipeGenerationSources,
  listGroceryListRecipeOptions,
  listGroceryLists,
  removeGroceryListItem,
  refreshGroceryListFromWeek,
  renameGroceryList,
  resetGroceryListChecklist,
  setGroceryListItemChecked,
  updateGroceryListItem
} from "../grocery-list.repository";
import type { GroceryListGenerationRecipeRow } from "../grocery-list.mappers";

const RECIPE_ONE_ID = "22000000-0000-0000-0000-000000000001";
const RECIPE_TWO_ID = "22000000-0000-0000-0000-000000000002";
const OWNER_ID = "12000000-0000-0000-0000-000000000001";

function authenticatedAuth() {
  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: OWNER_ID } },
      error: null
    })
  };
}

function generationRecipeRow(id = RECIPE_ONE_ID) {
  return {
    id,
    recipe_ingredients: [
      {
        amount: 1,
        id: "32000000-0000-0000-0000-000000000002",
        name: "Pepper",
        notes: "ground",
        sort_order: 1,
        unit: "tbsp"
      },
      {
        amount: 2,
        id: "32000000-0000-0000-0000-000000000001",
        name: "Rice",
        notes: null,
        sort_order: 0,
        unit: "cups"
      }
    ],
    servings: 4,
    title: "Curry"
  };
}

function createGenerationRead(rows: GroceryListGenerationRecipeRow[]) {
  const is = vi.fn().mockResolvedValue({ data: rows, error: null });
  const inRows = vi.fn(() => ({ is }));
  const eq = vi.fn(() => ({ in: inRows }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { eq, from, inRows, is, select };
}

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

function mealPlanSourceRow(entries: unknown[] = [
  {
    id: "entry-1",
    meal_type: "dinner",
    planned_for: "2026-08-17",
    recipe_id: RECIPE_ONE_ID,
    recipes: {
      ...generationRecipeRow(),
      archived_at: "2026-08-20T10:00:00Z"
    },
    servings: 8
  }
]) {
  return {
    id: "42000000-0000-0000-0000-000000000001",
    meal_plan_entries: entries,
    week_start_date: "2026-08-17"
  };
}

function createBoundedRead(data: unknown) {
  const chain = {
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null })
  };
  const select = vi.fn(() => chain);
  const from = vi.fn(() => ({ select }));
  return { chain, from, select };
}

describe("grocery list repository reads", () => {
  it("loads server-filtered active recipe options", async () => {
    const rows = [
      {
        id: RECIPE_ONE_ID,
        ingredient_names: ["Rice"],
        saved_servings: 4,
        title: "Curry"
      }
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });

    await expect(
      listGroceryListRecipeOptions(
        { auth: authenticatedAuth(), rpc } as never,
        " rice "
      )
    ).resolves.toEqual([
      {
        id: RECIPE_ONE_ID,
        ingredientNames: ["Rice"],
        savedServings: 4,
        title: "Curry"
      }
    ]);
    expect(rpc).toHaveBeenCalledWith(
      "search_grocery_list_recipe_options",
      { p_search: "rice" }
    );
  });

  it("does not load recipe options without an authenticated owner", async () => {
    const rpc = vi.fn();

    await expect(
      listGroceryListRecipeOptions({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        },
        rpc
      } as never, "")
    ).rejects.toBeInstanceOf(GroceryListAuthenticationError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the summary RPC and maps its rows", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          checked_item_count: 1,
          id: "list-1",
          item_count: 3,
          meal_plan_available: false,
          source_recipe_count: 0,
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

  it("loads active full sources and preserves selected recipe order", async () => {
    const firstRow = generationRecipeRow(RECIPE_ONE_ID);
    const secondRow = {
      ...generationRecipeRow(RECIPE_TWO_ID),
      recipe_ingredients: [
        {
          amount: null,
          id: "32000000-0000-0000-0000-000000000003",
          name: "Salt",
          notes: null,
          sort_order: 0,
          unit: null
        }
      ],
      title: "Soup"
    };
    const read = createGenerationRead([firstRow, secondRow]);

    const sources = await getSelectedRecipeGenerationSources(
      { auth: authenticatedAuth(), from: read.from } as never,
      [
        {
          recipeId: RECIPE_ONE_ID,
          selectedRecipeOrder: 1,
          targetServings: 8
        },
        {
          recipeId: RECIPE_TWO_ID,
          selectedRecipeOrder: 0,
          targetServings: 3
        }
      ]
    );

    expect(read.inRows).toHaveBeenCalledWith("id", [
      RECIPE_TWO_ID,
      RECIPE_ONE_ID
    ]);
    expect(read.eq).toHaveBeenCalledWith("owner_id", OWNER_ID);
    expect(read.is).toHaveBeenCalledWith("archived_at", null);
    expect(sources.map(({ recipeId }) => recipeId)).toEqual([
      RECIPE_TWO_ID,
      RECIPE_ONE_ID
    ]);
    expect(sources[1]?.ingredients.map(({ name }) => name)).toEqual([
      "Rice",
      "Pepper"
    ]);
  });

  it("uses one generic error when an active source is stale or unavailable", async () => {
    const read = createGenerationRead([]);

    await expect(
      getSelectedRecipeGenerationSources(
        { auth: authenticatedAuth(), from: read.from } as never,
        [
          {
            recipeId: RECIPE_ONE_ID,
            selectedRecipeOrder: 0,
            targetServings: 4
          }
        ]
      )
    ).rejects.toBeInstanceOf(GroceryListRecipeUnavailableError);
  });

  it("does not load full generation sources without an authenticated owner", async () => {
    const from = vi.fn();

    await expect(
      getSelectedRecipeGenerationSources(
        {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null
            })
          },
          from
        } as never,
        [
          {
            recipeId: RECIPE_ONE_ID,
            selectedRecipeOrder: 0,
            targetServings: 4
          }
        ]
      )
    ).rejects.toBeInstanceOf(GroceryListAuthenticationError);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("selected recipe grocery creation", () => {
  it("refetches sources, regenerates, and sends one exact atomic RPC payload", async () => {
    const read = createGenerationRead([generationRecipeRow()]);
    const rpc = vi.fn().mockResolvedValue({
      data: "62000000-0000-0000-0000-000000000001",
      error: null
    });

    await expect(
      createGeneratedGroceryList({
        auth: authenticatedAuth(),
        from: read.from,
        rpc
      } as never, {
        recipes: [
          {
            recipeId: RECIPE_ONE_ID,
            selectedRecipeOrder: 0,
            targetServings: 8
          }
        ],
        title: "  Recipe groceries  "
      })
    ).resolves.toBe("62000000-0000-0000-0000-000000000001");

    expect(read.from).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("create_grocery_list_with_items", {
      p_items: [
        {
          name: "Rice",
          sort_order: 0,
          sources: [
            {
              canonical_unit: "cup",
              contributed_amount: 4,
              ingredient_amount: 2,
              ingredient_name: "Rice",
              ingredient_notes: null,
              ingredient_unit: "cups",
              recipe_id: RECIPE_ONE_ID,
              recipe_ingredient_id:
                "32000000-0000-0000-0000-000000000001",
              recipe_title: "Curry",
              saved_servings: 4,
              scale_factor: 2,
              sort_order: 0,
              target_servings: 8
            }
          ]
        },
        {
          name: "Pepper",
          sort_order: 1,
          sources: [
            {
              canonical_unit: "tbsp",
              contributed_amount: 2,
              ingredient_amount: 1,
              ingredient_name: "Pepper",
              ingredient_notes: "ground",
              ingredient_unit: "tbsp",
              recipe_id: RECIPE_ONE_ID,
              recipe_ingredient_id:
                "32000000-0000-0000-0000-000000000002",
              recipe_title: "Curry",
              saved_servings: 4,
              scale_factor: 2,
              sort_order: 0,
              target_servings: 8
            }
          ]
        }
      ],
      p_meal_plan_id: null,
      p_source_type: "recipes",
      p_source_week_start_date: null,
      p_title: "Recipe groceries"
    });
  });

  it("maps a stale atomic RPC failure without attempting partial writes", async () => {
    const read = createGenerationRead([generationRecipeRow()]);
    const rpcError = {
      code: "42501",
      message: "A source recipe is not available."
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });
    const client = { auth: authenticatedAuth(), from: read.from, rpc };

    await expect(
      createGeneratedGroceryList(client as never, {
        recipes: [
          {
            recipeId: RECIPE_ONE_ID,
            selectedRecipeOrder: 0,
            targetServings: 4
          }
        ],
        title: "Recipe groceries"
      })
    ).rejects.toBeInstanceOf(GroceryListRecipeUnavailableError);

    expect(read.from).toHaveBeenCalledTimes(1);
    expect(read.from).toHaveBeenCalledWith("recipes");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("distinguishes an expired RPC session from a stale source", async () => {
    const read = createGenerationRead([generationRecipeRow()]);
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "Authentication is required." }
    });

    await expect(
      createGeneratedGroceryList(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        {
          recipes: [
            {
              recipeId: RECIPE_ONE_ID,
              selectedRecipeOrder: 0,
              targetServings: 4
            }
          ],
          title: "Recipe groceries"
        }
      )
    ).rejects.toBeInstanceOf(GroceryListAuthenticationError);
  });

  it("does not disguise unrelated permission failures as stale recipes", async () => {
    const read = createGenerationRead([generationRecipeRow()]);
    const permissionError = { code: "42501", message: "Permission denied." };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: permissionError });

    await expect(
      createGeneratedGroceryList(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        {
          recipes: [
            {
              recipeId: RECIPE_ONE_ID,
              selectedRecipeOrder: 0,
              targetServings: 4
            }
          ],
          title: "Recipe groceries"
        }
      )
    ).rejects.toBe(permissionError);
  });

  it("maps a controlled 300-item generation limit to actionable guidance", async () => {
    const row = generationRecipeRow();
    row.recipe_ingredients = Array.from({ length: 301 }, (_, index) => ({
      amount: 1,
      id: `ingredient-${index}`,
      name: `Ingredient ${index}`,
      notes: null,
      sort_order: index,
      unit: "pcs"
    }));
    const read = createGenerationRead([row]);
    const rpc = vi.fn();

    await expect(
      createGeneratedGroceryList(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        {
          recipes: [
            {
              recipeId: RECIPE_ONE_ID,
              selectedRecipeOrder: 0,
              targetServings: 4
            }
          ],
          title: "Recipe groceries"
        }
      )
    ).rejects.toBeInstanceOf(GroceryListItemLimitError);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("meal-plan grocery generation and refresh", () => {
  it("loads one authoritative owned Monday week including archived sources", async () => {
    const read = createBoundedRead(mealPlanSourceRow());

    await expect(
      getMealPlanGrocerySource(
        { auth: authenticatedAuth(), from: read.from } as never,
        "2026-08-17"
      )
    ).resolves.toMatchObject({
      mealPlanId: "42000000-0000-0000-0000-000000000001",
      recipes: [
        {
          archived: true,
          plannedServings: 8,
          recipeId: RECIPE_ONE_ID,
          scaleLabel: "2×"
        }
      ],
      weekStartDate: "2026-08-17"
    });

    expect(read.from).toHaveBeenCalledWith("meal_plans");
    expect(read.chain.eq).toHaveBeenNthCalledWith(1, "owner_id", OWNER_ID);
    expect(read.chain.eq).toHaveBeenNthCalledWith(
      2,
      "week_start_date",
      "2026-08-17"
    );
  });

  it("uses one generic unavailable result for missing and empty weeks", async () => {
    const missing = createBoundedRead(null);
    const empty = createBoundedRead(mealPlanSourceRow([]));

    await expect(
      getMealPlanGrocerySource(
        { auth: authenticatedAuth(), from: missing.from } as never,
        "2026-08-17"
      )
    ).rejects.toBeInstanceOf(GroceryListMealPlanUnavailableError);
    await expect(
      getMealPlanGrocerySource(
        { auth: authenticatedAuth(), from: empty.from } as never,
        "2026-08-17"
      )
    ).rejects.toBeInstanceOf(GroceryListMealPlanUnavailableError);
  });

  it("refetches the authoritative week immediately before atomic creation", async () => {
    const read = createBoundedRead(mealPlanSourceRow());
    const rpc = vi.fn().mockResolvedValue({
      data: "62000000-0000-0000-0000-000000000001",
      error: null
    });

    await expect(
      createMealPlanGroceryList(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        { title: "  Weekly shop  ", weekStartDate: "2026-08-17" }
      )
    ).resolves.toBe("62000000-0000-0000-0000-000000000001");

    expect(read.chain.maybeSingle.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[0]!
    );
    expect(rpc).toHaveBeenCalledWith("create_grocery_list_with_items", {
      p_items: expect.arrayContaining([
        expect.objectContaining({ name: "Rice", sort_order: 0 })
      ]),
      p_meal_plan_id: "42000000-0000-0000-0000-000000000001",
      p_source_type: "meal_plan",
      p_source_week_start_date: "2026-08-17",
      p_title: "Weekly shop"
    });
  });

  it("resolves refresh only through the linked owned list and permits an empty week", async () => {
    const plan = mealPlanSourceRow([]);
    const read = createBoundedRead({
      id: "62000000-0000-0000-0000-000000000001",
      meal_plan_id: plan.id,
      meal_plans: plan,
      source_type: "meal_plan"
    });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await refreshGroceryListFromWeek(
      { auth: authenticatedAuth(), from: read.from, rpc } as never,
      { groceryListId: "62000000-0000-0000-0000-000000000001" }
    );

    expect(read.from).toHaveBeenCalledWith("grocery_lists");
    expect(read.chain.eq).toHaveBeenNthCalledWith(
      1,
      "id",
      "62000000-0000-0000-0000-000000000001"
    );
    expect(read.chain.eq).toHaveBeenNthCalledWith(2, "owner_id", OWNER_ID);
    expect(read.chain.eq).toHaveBeenNthCalledWith(
      3,
      "source_type",
      "meal_plan"
    );
    expect(read.chain.maybeSingle.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[0]!
    );
    expect(rpc).toHaveBeenCalledWith(
      "refresh_grocery_list_from_meal_plan",
      {
        p_generated_items: [],
        p_grocery_list_id: "62000000-0000-0000-0000-000000000001"
      }
    );
  });

  it("never calls refresh for a manual, detached, deleted, or inaccessible link", async () => {
    const read = createBoundedRead(null);
    const rpc = vi.fn();

    await expect(
      refreshGroceryListFromWeek(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        { groceryListId: "62000000-0000-0000-0000-000000000001" }
      )
    ).rejects.toBeInstanceOf(GroceryListMealPlanUnavailableError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a changed or deleted source during the atomic RPC generically", async () => {
    const plan = mealPlanSourceRow();
    const read = createBoundedRead({
      id: "62000000-0000-0000-0000-000000000001",
      meal_plan_id: plan.id,
      meal_plans: plan,
      source_type: "meal_plan"
    });
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Meal-plan grocery list is not available."
      }
    });

    await expect(
      refreshGroceryListFromWeek(
        { auth: authenticatedAuth(), from: read.from, rpc } as never,
        { groceryListId: "62000000-0000-0000-0000-000000000001" }
      )
    ).rejects.toBeInstanceOf(GroceryListMealPlanUnavailableError);
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

  it("resets only checked items belonging to the requested grocery list", async () => {
    const result = { data: null, error: null };
    const chain = {
      eq: vi.fn(() => chain),
      then: (resolve: (value: typeof result) => unknown) =>
        Promise.resolve(result).then(resolve)
    };
    const update = vi.fn(() => chain);
    const from = vi.fn(() => ({ update }));

    await resetGroceryListChecklist({ from } as never, {
      groceryListId: "list-1"
    });

    expect(from).toHaveBeenCalledWith("grocery_list_items");
    expect(update).toHaveBeenCalledWith({ checked: false });
    expect(chain.eq).toHaveBeenNthCalledWith(1, "grocery_list_id", "list-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "checked", true);
  });
});
