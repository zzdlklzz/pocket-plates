import { describe, expect, it, vi } from "vitest";
import {
  getMealTypeFilterValues,
  listArchivedRecipes,
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
});
