import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMealPlanEntry,
  DuplicateMealPlanEntryError,
  getMealPlanWeek,
  listMealPlanRecipeOptions,
  removeMealPlanEntry,
  restoreMealPlanEntry
} from "../meal-planning.repository";
import type { AddMealPlanEntryInput } from "../meal-planning.types";

const baseInput: AddMealPlanEntryInput = {
  mealType: "dinner",
  plannedFor: "2026-08-19",
  recipeId: "recipe-1",
  servings: 2,
  weekStartDate: "2026-08-17"
};

function createRestoreClient({
  archivedAt = "2026-08-20T00:00:00Z",
  insertError = null
}: {
  archivedAt?: string | null;
  insertError?: { code: string; message: string } | null;
} = {}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "owner-1" } },
    error: null
  });
  const recipeMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      archived_at: archivedAt,
      id: "recipe-1",
      servings: 4,
      title: "Archived noodles"
    },
    error: null
  });
  const recipeIs = vi.fn();
  const recipeOwnerEq = vi.fn(() => ({
    is: recipeIs,
    maybeSingle: recipeMaybeSingle
  }));
  const recipeIdEq = vi.fn(() => ({ eq: recipeOwnerEq }));
  const planSingle = vi.fn().mockResolvedValue({
    data: { id: "plan-1" },
    error: null
  });
  const upsert = vi.fn(() => ({
    select: vi.fn(() => ({ single: planSingle }))
  }));
  const entrySingle = vi.fn().mockResolvedValue({
    data: insertError
      ? null
      : {
          id: "restored-entry",
          meal_plan_id: "plan-1",
          meal_type: "dinner",
          planned_for: "2026-08-19",
          recipe_id: "recipe-1",
          servings: 2
        },
    error: insertError
  });
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single: entrySingle }))
  }));
  const from = vi.fn((table: string) => {
    if (table === "recipes") {
      return { select: vi.fn(() => ({ eq: recipeIdEq })) };
    }
    if (table === "meal_plans") {
      return { upsert };
    }
    return { insert };
  });

  return {
    client: { auth: { getUser }, from },
    getUser,
    insert,
    recipeIs,
    recipeOwnerEq
  };
}

describe("meal planner week reads", () => {
  it("returns an empty DTO without creating a plan row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn();
    const from = vi.fn(() => ({ select, upsert }));

    await expect(
      getMealPlanWeek({ from } as never, "2026-08-17")
    ).resolves.toEqual({
      entries: [],
      planId: null,
      weekStartDate: "2026-08-17"
    });

    expect(from).toHaveBeenCalledWith("meal_plans");
    expect(eq).toHaveBeenCalledWith("week_start_date", "2026-08-17");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("maps archived recipes and orders entries by date and meal slot", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "plan-1",
        week_start_date: "2026-08-17",
        meal_plan_entries: [
          {
            id: "entry-2",
            meal_plan_id: "plan-1",
            meal_type: "breakfast",
            planned_for: "2026-08-18",
            recipe_id: "recipe-2",
            recipes: {
              archived_at: "2026-08-20T00:00:00Z",
              id: "recipe-2",
              servings: 4,
              title: "Archived toast"
            },
            servings: 1
          },
          {
            id: "entry-1",
            meal_plan_id: "plan-1",
            meal_type: "dinner",
            planned_for: "2026-08-17",
            recipe_id: "recipe-1",
            recipes: {
              archived_at: null,
              id: "recipe-1",
              servings: 2,
              title: "Noodles"
            },
            servings: 3
          }
        ]
      },
      error: null
    });
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }))
    }));

    const week = await getMealPlanWeek({ from } as never, "2026-08-17");

    expect(week.planId).toBe("plan-1");
    expect(week.entries.map(({ id }) => id)).toEqual(["entry-1", "entry-2"]);
    expect(week.entries[1].recipe).toEqual({
      archived: true,
      id: "recipe-2",
      servings: 4,
      title: "Archived toast"
    });
  });

  it("requires a valid Monday", async () => {
    await expect(
      getMealPlanWeek({} as never, "2026-08-18")
    ).rejects.toThrow("valid Monday");
  });
});

describe("meal planner recipe options", () => {
  it("loads active recipes once with meal types and ingredient names", async () => {
    const rows = [
      {
        id: "recipe-1",
        recipe_ingredients: [{ name: "Tomato" }, { name: "Rice" }],
        recipe_meal_types: [{ meal_type: "lunch" }],
        servings: 3,
        title: "Tomato rice"
      }
    ];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const is = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ is }));
    const from = vi.fn(() => ({ select }));

    await expect(
      listMealPlanRecipeOptions({ from } as never)
    ).resolves.toEqual([
      {
        archived: false,
        id: "recipe-1",
        ingredientNames: ["Tomato", "Rice"],
        mealTypes: ["lunch"],
        servings: 3,
        title: "Tomato rice"
      }
    ]);

    expect(from).toHaveBeenCalledWith("recipes");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(order).toHaveBeenCalledWith("title", { ascending: true });
  });
});

describe("meal planner entry writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ ...baseInput, plannedFor: "2026-08-24" }, "selected week"],
    [{ ...baseInput, servings: 0 }, "whole number"],
    [{ ...baseInput, servings: 1.5 }, "whole number"],
    [{ ...baseInput, servings: 101 }, "whole number"]
  ])("rejects invalid input before making a request", async (input, message) => {
    const getUser = vi.fn();

    await expect(
      addMealPlanEntry({ auth: { getUser } } as never, input as AddMealPlanEntryInput)
    ).rejects.toThrow(message);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("validates the active owned recipe before lazily creating the week", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "owner-1" } },
      error: null
    });
    const recipeMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const recipeIs = vi.fn(() => ({ maybeSingle: recipeMaybeSingle }));
    const recipeOwnerEq = vi.fn(() => ({ is: recipeIs }));
    const recipeIdEq = vi.fn(() => ({ eq: recipeOwnerEq }));
    const upsert = vi.fn();
    const from = vi.fn((table: string) =>
      table === "recipes"
        ? { select: vi.fn(() => ({ eq: recipeIdEq })) }
        : { upsert }
    );

    await expect(
      addMealPlanEntry({ auth: { getUser }, from } as never, baseInput)
    ).rejects.toThrow("active recipe");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts the week and adds a validated entry", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "owner-1" } },
      error: null
    });
    const recipeMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        archived_at: null,
        id: "recipe-1",
        servings: 4,
        title: "Noodles"
      },
      error: null
    });
    const recipeIs = vi.fn(() => ({ maybeSingle: recipeMaybeSingle }));
    const recipeOwnerEq = vi.fn(() => ({ is: recipeIs }));
    const recipeIdEq = vi.fn(() => ({ eq: recipeOwnerEq }));
    const planSingle = vi.fn().mockResolvedValue({
      data: { id: "plan-1" },
      error: null
    });
    const planSelect = vi.fn(() => ({ single: planSingle }));
    const upsert = vi.fn(() => ({ select: planSelect }));
    const entrySingle = vi.fn().mockResolvedValue({
      data: {
        id: "entry-1",
        meal_plan_id: "plan-1",
        meal_type: "dinner",
        planned_for: "2026-08-19",
        recipe_id: "recipe-1",
        servings: 2
      },
      error: null
    });
    const entrySelect = vi.fn(() => ({ single: entrySingle }));
    const insert = vi.fn(() => ({ select: entrySelect }));
    const from = vi.fn((table: string) => {
      if (table === "recipes") {
        return { select: vi.fn(() => ({ eq: recipeIdEq })) };
      }
      if (table === "meal_plans") {
        return { upsert };
      }
      return { insert };
    });

    await expect(
      addMealPlanEntry({ auth: { getUser }, from } as never, baseInput)
    ).resolves.toEqual({
      id: "entry-1",
      mealType: "dinner",
      planId: "plan-1",
      plannedFor: "2026-08-19",
      recipe: {
        archived: false,
        id: "recipe-1",
        servings: 4,
        title: "Noodles"
      },
      servings: 2
    });

    expect(recipeIdEq).toHaveBeenCalledWith("id", "recipe-1");
    expect(recipeOwnerEq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(upsert).toHaveBeenCalledWith(
      [{ owner_id: "owner-1", week_start_date: "2026-08-17" }],
      { onConflict: "owner_id,week_start_date" }
    );
    expect(insert).toHaveBeenCalledWith([
      {
        meal_plan_id: "plan-1",
        meal_type: "dinner",
        planned_for: "2026-08-19",
        recipe_id: "recipe-1",
        servings: 2
      }
    ]);
  });

  it("turns the exact-entry constraint into a focused duplicate error", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "owner-1" } },
      error: null
    });
    const from = vi.fn((table: string) => {
      if (table === "recipes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      archived_at: null,
                      id: "recipe-1",
                      servings: 2,
                      title: "Noodles"
                    },
                    error: null
                  })
                }))
              }))
            }))
          }))
        };
      }
      if (table === "meal_plans") {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "plan-1" },
                error: null
              })
            }))
          }))
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23505", message: "duplicate" }
            })
          }))
        }))
      };
    });

    await expect(
      addMealPlanEntry({ auth: { getUser }, from } as never, baseInput)
    ).rejects.toBeInstanceOf(DuplicateMealPlanEntryError);
  });

  it("restores a removed entry when its owned recipe is archived", async () => {
    const { client, recipeIs, recipeOwnerEq } = createRestoreClient();

    await expect(
      restoreMealPlanEntry(client as never, baseInput)
    ).resolves.toEqual({
      id: "restored-entry",
      mealType: "dinner",
      planId: "plan-1",
      plannedFor: "2026-08-19",
      recipe: {
        archived: true,
        id: "recipe-1",
        servings: 4,
        title: "Archived noodles"
      },
      servings: 2
    });

    expect(recipeOwnerEq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(recipeIs).not.toHaveBeenCalled();
  });

  it("validates a restore before reading the authenticated recipe", async () => {
    const { client, getUser } = createRestoreClient();

    await expect(
      restoreMealPlanEntry(client as never, { ...baseInput, servings: 0 })
    ).rejects.toThrow("whole number");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("retains duplicate protection when restoring an entry", async () => {
    const { client } = createRestoreClient({
      insertError: { code: "23505", message: "duplicate" }
    });

    await expect(
      restoreMealPlanEntry(client as never, baseInput)
    ).rejects.toBeInstanceOf(DuplicateMealPlanEntryError);
  });

  it("returns the complete add input needed to undo a removal", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        meal_type: "dinner",
        planned_for: "2026-08-19",
        recipe_id: "recipe-1",
        servings: 2
      },
      error: null
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const deleteRow = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: deleteRow }));

    await expect(
      removeMealPlanEntry({ from } as never, {
        entryId: "entry-1",
        weekStartDate: "2026-08-17"
      })
    ).resolves.toEqual(baseInput);

    expect(eq).toHaveBeenCalledWith("id", "entry-1");
  });
});
