import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMealPlanEntry,
  addMealPlanEntries,
  DuplicateMealPlanEntryError,
  getMealPlanWeek,
  listMealPlanRecipeOptions,
  previewMealPlanEntries,
  removeMealPlanEntry,
  restoreMealPlanEntry,
  updateMealPlanEntry
} from "../meal-planning.repository";
import type { MealPlanPasteInput } from "../meal-planning.copy";
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

function createUpdateClient({
  currentWeekStart = "2026-08-17",
  updateError = null
}: {
  currentWeekStart?: string;
  updateError?: { code: string; message: string } | null;
} = {}) {
  const currentMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: "entry-1",
      meal_plan_id: "plan-1",
      meal_plans: { week_start_date: currentWeekStart },
      meal_type: "dinner",
      planned_for: "2026-08-19",
      recipe_id: "recipe-1",
      recipes: {
        archived_at: "2026-08-20T00:00:00Z",
        id: "recipe-1",
        servings: 4,
        title: "Archived noodles"
      },
      servings: 2
    },
    error: null
  });
  const currentEq = vi.fn(() => ({ maybeSingle: currentMaybeSingle }));
  const updatedMaybeSingle = vi.fn().mockResolvedValue({
    data: updateError
      ? null
      : {
          id: "entry-1",
          meal_plan_id: "plan-1",
          meal_type: "lunch",
          planned_for: "2026-08-21",
          recipe_id: "recipe-1",
          recipes: {
            archived_at: "2026-08-20T00:00:00Z",
            id: "recipe-1",
            servings: 4,
            title: "Archived noodles"
          },
          servings: 3
        },
    error: updateError
  });
  const updateSelect = vi.fn(() => ({ maybeSingle: updatedMaybeSingle }));
  const planEq = vi.fn(() => ({ select: updateSelect }));
  const entryEq = vi.fn(() => ({ eq: planEq }));
  const update = vi.fn(() => ({ eq: entryEq }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: currentEq })),
    update
  }));

  return { client: { from }, currentEq, entryEq, planEq, update };
}

function createPasteClient({
  batchError = null,
  insertedIds = ["inserted-1"],
  recipeRows = [
    { archived_at: null, id: "active-1" },
    { archived_at: null, id: "active-2" },
    { archived_at: "2026-08-20T00:00:00Z", id: "archived-1" }
  ],
  targetEntries = []
}: {
  batchError?: Error | null;
  insertedIds?: string[];
  recipeRows?: { archived_at: string | null; id: string }[];
  targetEntries?: {
    meal_type: "breakfast" | "dinner" | "lunch";
    planned_for: string;
    recipe_id: string;
  }[];
} = {}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "owner-1" } },
    error: null
  });
  const recipeIn = vi.fn().mockResolvedValue({ data: recipeRows, error: null });
  const recipeOwnerEq = vi.fn(() => ({ in: recipeIn }));
  const planMaybeSingle = vi.fn().mockResolvedValue({
    data: targetEntries.length
      ? { id: "plan-1", meal_plan_entries: targetEntries }
      : null,
    error: null
  });
  const planEq = vi.fn(() => ({ maybeSingle: planMaybeSingle }));
  const planSingle = vi.fn().mockResolvedValue({
    data: { id: "plan-1" },
    error: null
  });
  const planUpsert = vi.fn(() => ({
    select: vi.fn(() => ({ single: planSingle }))
  }));
  const batchSelect = vi.fn().mockResolvedValue({
    data: batchError ? null : insertedIds.map((id) => ({ id })),
    error: batchError
  });
  const entryUpsert = vi.fn(() => ({ select: batchSelect }));
  const from = vi.fn((table: string) => {
    if (table === "recipes") {
      return {
        select: vi.fn(() => ({ eq: recipeOwnerEq }))
      };
    }
    if (table === "meal_plans") {
      return {
        select: vi.fn(() => ({ eq: planEq })),
        upsert: planUpsert
      };
    }
    return { upsert: entryUpsert };
  });

  return {
    batchSelect,
    client: { auth: { getUser }, from },
    entryUpsert,
    planUpsert,
    recipeIn
  };
}

const pasteInput: MealPlanPasteInput = {
  entries: [
    {
      mealType: "dinner",
      plannedFor: "2026-08-17",
      recipeId: "active-1",
      servings: 2
    },
    {
      mealType: "lunch",
      plannedFor: "2026-08-18",
      recipeId: "active-2",
      servings: 3
    },
    {
      mealType: "dinner",
      plannedFor: "2026-08-19",
      recipeId: "archived-1",
      servings: 2
    },
    {
      mealType: "breakfast",
      plannedFor: "2026-08-20",
      recipeId: "missing-1",
      servings: 1
    }
  ],
  weekStartDate: "2026-08-17"
};

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

  it("edits only day, meal type, and servings for an archived entry", async () => {
    const { client, entryEq, planEq, update } = createUpdateClient();
    const input = {
      entryId: "entry-1",
      mealType: "lunch" as const,
      plannedFor: "2026-08-21" as const,
      servings: 3,
      weekStartDate: "2026-08-17" as const
    };

    await expect(updateMealPlanEntry(client as never, input)).resolves.toEqual({
      id: "entry-1",
      mealType: "lunch",
      planId: "plan-1",
      plannedFor: "2026-08-21",
      recipe: {
        archived: true,
        id: "recipe-1",
        servings: 4,
        title: "Archived noodles"
      },
      servings: 3
    });

    expect(update).toHaveBeenCalledWith({
      meal_type: "lunch",
      planned_for: "2026-08-21",
      servings: 3
    });
    expect(entryEq).toHaveBeenCalledWith("id", "entry-1");
    expect(planEq).toHaveBeenCalledWith("meal_plan_id", "plan-1");
  });

  it("rejects edit values outside the selected week before reading", async () => {
    const from = vi.fn();

    await expect(
      updateMealPlanEntry({ from } as never, {
        entryId: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-24",
        servings: 3,
        weekStartDate: "2026-08-17"
      })
    ).rejects.toThrow("selected week");
    expect(from).not.toHaveBeenCalled();
  });

  it("does not move an entry from a different plan week", async () => {
    const { client, update } = createUpdateClient({
      currentWeekStart: "2026-08-10"
    });

    await expect(
      updateMealPlanEntry(client as never, {
        entryId: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-21",
        servings: 3,
        weekStartDate: "2026-08-17"
      })
    ).rejects.toThrow("selected week");
    expect(update).not.toHaveBeenCalled();
  });

  it("maps an exact duplicate edit to the focused duplicate error", async () => {
    const { client } = createUpdateClient({
      updateError: { code: "23505", message: "duplicate" }
    });

    await expect(
      updateMealPlanEntry(client as never, {
        entryId: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-21",
        servings: 3,
        weekStartDate: "2026-08-17"
      })
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

describe("meal planner batch paste", () => {
  it("previews a partial target without writing a plan or entries", async () => {
    const { client, entryUpsert, planUpsert } = createPasteClient({
      targetEntries: [
        {
          meal_type: "dinner",
          planned_for: "2026-08-17",
          recipe_id: "active-1"
        }
      ]
    });

    await expect(
      previewMealPlanEntries(client as never, pasteInput)
    ).resolves.toEqual({
      archivedCount: 1,
      deletedCount: 1,
      eligibleCount: 1,
      exactDuplicateCount: 1
    });
    expect(planUpsert).not.toHaveBeenCalled();
    expect(entryUpsert).not.toHaveBeenCalled();
  });

  it("rechecks active ownership, resolves one plan, and writes one bounded batch", async () => {
    const { client, entryUpsert, planUpsert, recipeIn } = createPasteClient({
      insertedIds: ["inserted-1"]
    });

    await expect(addMealPlanEntries(client as never, pasteInput)).resolves.toEqual({
      addedCount: 1,
      archivedCount: 1,
      deletedCount: 1,
      exactDuplicateCount: 1
    });

    expect(recipeIn).toHaveBeenCalledWith("id", [
      "active-1",
      "active-2",
      "archived-1",
      "missing-1"
    ]);
    expect(planUpsert).toHaveBeenCalledTimes(1);
    expect(entryUpsert).toHaveBeenCalledTimes(1);
    expect(entryUpsert).toHaveBeenCalledWith(
      [
        {
          meal_plan_id: "plan-1",
          meal_type: "dinner",
          planned_for: "2026-08-17",
          recipe_id: "active-1",
          servings: 2
        },
        {
          meal_plan_id: "plan-1",
          meal_type: "lunch",
          planned_for: "2026-08-18",
          recipe_id: "active-2",
          servings: 3
        }
      ],
      {
        ignoreDuplicates: true,
        onConflict: "meal_plan_id,planned_for,meal_type,recipe_id"
      }
    );
  });

  it("does not create a target plan when every copied recipe is unavailable", async () => {
    const { client, entryUpsert, planUpsert } = createPasteClient({
      recipeRows: [
        {
          archived_at: "2026-08-20T00:00:00Z",
          id: "archived-1"
        }
      ]
    });

    await expect(addMealPlanEntries(client as never, pasteInput)).resolves.toEqual({
      addedCount: 0,
      archivedCount: 1,
      deletedCount: 3,
      exactDuplicateCount: 0
    });
    expect(planUpsert).not.toHaveBeenCalled();
    expect(entryUpsert).not.toHaveBeenCalled();
  });

  it("does not write when a repeated paste is already present", async () => {
    const { client, entryUpsert, planUpsert } = createPasteClient({
      targetEntries: [
        {
          meal_type: "dinner",
          planned_for: "2026-08-17",
          recipe_id: "active-1"
        },
        {
          meal_type: "lunch",
          planned_for: "2026-08-18",
          recipe_id: "active-2"
        }
      ]
    });

    await expect(addMealPlanEntries(client as never, pasteInput)).resolves.toMatchObject({
      addedCount: 0,
      exactDuplicateCount: 2
    });
    expect(planUpsert).not.toHaveBeenCalled();
    expect(entryUpsert).not.toHaveBeenCalled();
  });

  it("counts a duplicate created after the target read from actual inserts", async () => {
    const { client, entryUpsert } = createPasteClient({ insertedIds: [] });

    await expect(addMealPlanEntries(client as never, pasteInput)).resolves.toMatchObject({
      addedCount: 0,
      exactDuplicateCount: 2
    });
    expect(entryUpsert).toHaveBeenCalledTimes(1);
  });

  it("propagates one atomic batch failure without retrying individual rows", async () => {
    const error = new Error("batch failed");
    const { client, entryUpsert } = createPasteClient({ batchError: error });

    await expect(addMealPlanEntries(client as never, pasteInput)).rejects.toBe(error);
    expect(entryUpsert).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized paste input before making a request", async () => {
    const getUser = vi.fn();

    await expect(
      addMealPlanEntries(
        { auth: { getUser } } as never,
        {
          entries: Array.from({ length: 101 }, () => pasteInput.entries[0]),
          weekStartDate: "2026-08-17"
        }
      )
    ).rejects.toThrow("100 meals");
    expect(getUser).not.toHaveBeenCalled();
  });
});
