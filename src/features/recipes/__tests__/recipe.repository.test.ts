import { describe, expect, it, vi } from "vitest";
import {
  deleteArchivedRecipes,
  getMealTypeFilterValues,
  listRecipes,
  listArchivedRecipes,
  normalizeRecipeListFilters,
  restoreRecipe
} from "../recipe.repository";

describe("getMealTypeFilterValues", () => {
  it("keeps flexible-only filters exact", () => {
    expect(getMealTypeFilterValues(["flexible"])).toEqual(["flexible"]);
  });

  it("includes flexible recipes when filtering by a specific meal type", () => {
    expect(getMealTypeFilterValues(["breakfast"])).toEqual(["breakfast", "flexible"]);
  });

  it("deduplicates flexible when it is already selected with specific meal types", () => {
    expect(getMealTypeFilterValues(["dinner", "flexible", "lunch"])).toEqual(["dinner", "flexible", "lunch"]);
  });
});

describe("private library recipe filters", () => {
  it("normalizes search and multi-select values for stable queries", () => {
    expect(
      normalizeRecipeListFilters({
        search: "  rice  ",
        mealTypes: ["lunch", "breakfast", "lunch"],
        costRatings: ["moderate", "cheap", "moderate"],
        difficulty: "easy",
        effortLabels: ["one_pot", "quick", "one_pot"]
      })
    ).toEqual({
      search: "rice",
      mealTypes: ["breakfast", "lunch"],
      costRatings: ["cheap", "moderate"],
      difficulty: "easy",
      effortLabels: ["one_pot", "quick"]
    });
  });

  it("uses one owner-scoped RPC for search and every active filter", async () => {
    const rows = [{ id: "recipe-1", title: "Egg fried rice" }];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });

    await expect(
      listRecipes({ rpc } as never, {
        search: "  egg  ",
        mealTypes: ["lunch", "breakfast", "lunch"],
        costRatings: ["cheap", "very_cheap"],
        difficulty: "beginner_friendly",
        effortLabels: ["quick", "one_pot"]
      })
    ).resolves.toBe(rows);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("list_private_library_recipes", {
      p_search: "egg",
      p_meal_types: ["breakfast", "lunch", "flexible"],
      p_cost_ratings: ["cheap", "very_cheap"],
      p_difficulty: "beginner_friendly",
      p_effort_labels: ["one_pot", "quick"]
    });
  });

  it("passes null for inactive RPC filters and propagates failures", async () => {
    const error = new Error("database details");
    const rpc = vi.fn().mockResolvedValue({ data: null, error });

    await expect(listRecipes({ rpc } as never, { search: "   " })).rejects.toBe(error);
    expect(rpc).toHaveBeenCalledWith("list_private_library_recipes", {
      p_search: null,
      p_meal_types: null,
      p_cost_ratings: null,
      p_difficulty: null,
      p_effort_labels: null
    });
  });
});

describe("archived recipe repository", () => {
  it("lists archived recipes from newest to oldest", async () => {
    const rows = [{ id: "recipe-1" }];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const not = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ not }));
    const from = vi.fn(() => ({ select }));

    await expect(listArchivedRecipes({ from } as never)).resolves.toBe(rows);
    expect(from).toHaveBeenCalledWith("recipes");
    expect(not).toHaveBeenCalledWith("archived_at", "is", null);
    expect(order).toHaveBeenCalledWith("archived_at", { ascending: false });
  });

  it("restores only an archived recipe with the supplied id", async () => {
    const not = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn(() => ({ not }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await expect(restoreRecipe({ from } as never, "recipe-1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ archived_at: null });
    expect(eq).toHaveBeenCalledWith("id", "recipe-1");
    expect(not).toHaveBeenCalledWith("archived_at", "is", null);
  });

  it("propagates restore errors", async () => {
    const error = new Error("database details");
    const not = vi.fn().mockResolvedValue({ error });
    const eq = vi.fn(() => ({ not }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await expect(restoreRecipe({ from } as never, "recipe-1")).rejects.toBe(error);
  });

  it("permanently deletes only matching archived recipes", async () => {
    const archivedRows = [
      { id: "recipe-1", image_storage_path: "user-1/recipe-1/cover.webp" },
      { id: "recipe-2", image_storage_path: "user-1/recipe-2/cover.webp" }
    ];
    const lookupNot = vi.fn().mockResolvedValue({ data: archivedRows, error: null });
    const lookupIn = vi.fn(() => ({ not: lookupNot }));
    const select = vi.fn(() => ({ in: lookupIn }));
    const deleteSelect = vi.fn().mockResolvedValue({ data: [{ id: "recipe-1" }], error: null });
    const deleteNot = vi.fn(() => ({ select: deleteSelect }));
    const deleteIn = vi.fn(() => ({ not: deleteNot }));
    const deleteRows = vi.fn(() => ({ in: deleteIn }));
    const from = vi.fn(() => ({ delete: deleteRows, select }));
    const remove = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn(() => ({ remove }));

    await deleteArchivedRecipes({ from, storage: { from: storageFrom } } as never, [
      "recipe-1",
      "recipe-2",
      "recipe-1"
    ]);

    expect(lookupIn).toHaveBeenCalledWith("id", ["recipe-1", "recipe-2"]);
    expect(lookupNot).toHaveBeenCalledWith("archived_at", "is", null);
    expect(deleteIn).toHaveBeenCalledWith("id", ["recipe-1", "recipe-2"]);
    expect(deleteNot).toHaveBeenCalledWith("archived_at", "is", null);
    expect(deleteSelect).toHaveBeenCalledWith("id");
    expect(remove).toHaveBeenCalledWith(["user-1/recipe-1/cover.webp"]);
  });

  it("does not delete when none of the selected recipes are archived", async () => {
    const lookupNot = vi.fn().mockResolvedValue({ data: [], error: null });
    const lookupIn = vi.fn(() => ({ not: lookupNot }));
    const deleteRows = vi.fn();
    const from = vi.fn(() => ({ delete: deleteRows, select: vi.fn(() => ({ in: lookupIn })) }));

    await deleteArchivedRecipes({ from } as never, ["active-recipe"]);

    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("propagates permanent deletion errors", async () => {
    const error = new Error("delete failed");
    const lookupNot = vi.fn().mockResolvedValue({
      data: [{ id: "recipe-1", image_storage_path: null }],
      error: null
    });
    const deleteSelect = vi.fn().mockResolvedValue({ data: null, error });
    const deleteNot = vi.fn(() => ({ select: deleteSelect }));
    const from = vi.fn(() => ({
      delete: vi.fn(() => ({ in: vi.fn(() => ({ not: deleteNot })) })),
      select: vi.fn(() => ({ in: vi.fn(() => ({ not: lookupNot })) }))
    }));

    await expect(deleteArchivedRecipes({ from } as never, ["recipe-1"])).rejects.toBe(error);
  });
});
