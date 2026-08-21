import { describe, expect, it } from "vitest";
import {
  buildMealPlanPrepSummary,
  formatMealPlanPrepScale
} from "../meal-planning.prep";
import type {
  IsoDate,
  MealPlanEntryDto,
  MealType
} from "../meal-planning.types";

function entry({
  archived = false,
  id,
  mealType = "dinner",
  plannedFor,
  plannedServings = 1,
  recipeId,
  savedRecipeYield = 4,
  title
}: {
  archived?: boolean;
  id: string;
  mealType?: MealType;
  plannedFor: IsoDate;
  plannedServings?: number;
  recipeId: string;
  savedRecipeYield?: number;
  title: string;
}): MealPlanEntryDto {
  return {
    id,
    mealType,
    planId: "plan-1",
    plannedFor,
    recipe: {
      archived,
      id: recipeId,
      servings: savedRecipeYield,
      title
    },
    servings: plannedServings
  };
}

describe("meal planner prep summary", () => {
  it("groups a recipe across days and meal types and sums planned servings", () => {
    const entries = [
      entry({
        id: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-18",
        plannedServings: 1,
        recipeId: "curry",
        title: "Coconut lentil curry"
      }),
      entry({
        id: "entry-2",
        mealType: "dinner",
        plannedFor: "2026-08-20",
        plannedServings: 2,
        recipeId: "curry",
        title: "Coconut lentil curry"
      })
    ];

    expect(buildMealPlanPrepSummary(entries)).toEqual({
      rows: [
        {
          appearanceCount: 2,
          archived: false,
          plannedDates: ["2026-08-18", "2026-08-20"],
          recipeId: "curry",
          savedRecipeYield: 4,
          title: "Coconut lentil curry",
          totalPlannedServings: 3
        }
      ],
      totalPlannedServings: 3
    });
  });

  it("counts repeated appearances while keeping contributing dates unique", () => {
    const entries = [
      entry({
        id: "entry-1",
        mealType: "breakfast",
        plannedFor: "2026-08-17",
        recipeId: "oats",
        title: "Berry oats"
      }),
      entry({
        id: "entry-2",
        mealType: "dinner",
        plannedFor: "2026-08-17",
        plannedServings: 2,
        recipeId: "oats",
        title: "Berry oats"
      })
    ];

    expect(buildMealPlanPrepSummary(entries).rows[0]).toMatchObject({
      appearanceCount: 2,
      plannedDates: ["2026-08-17"],
      totalPlannedServings: 3
    });
  });

  it("keeps different recipes in the same meal slot separate", () => {
    const entries = [
      entry({
        id: "entry-1",
        plannedFor: "2026-08-17",
        recipeId: "oats",
        title: "Berry oats"
      }),
      entry({
        id: "entry-2",
        plannedFor: "2026-08-17",
        plannedServings: 2,
        recipeId: "pasta",
        title: "Mushroom pasta"
      })
    ];

    const summary = buildMealPlanPrepSummary(entries);

    expect(summary.rows.map(({ recipeId }) => recipeId)).toEqual([
      "oats",
      "pasta"
    ]);
    expect(summary.totalPlannedServings).toBe(3);
  });

  it("includes archived planned recipes", () => {
    const summary = buildMealPlanPrepSummary([
      entry({
        archived: true,
        id: "entry-1",
        plannedFor: "2026-08-17",
        recipeId: "archived",
        title: "Archived soup"
      })
    ]);

    expect(summary.rows[0]).toMatchObject({
      archived: true,
      recipeId: "archived"
    });
  });

  it("sorts dates across boundaries and rows by earliest date, title, then id", () => {
    const entries = [
      entry({
        id: "entry-z",
        plannedFor: "2027-01-01",
        recipeId: "recipe-z",
        title: "Later"
      }),
      entry({
        id: "entry-b",
        plannedFor: "2026-12-31",
        recipeId: "recipe-b",
        title: "Same title"
      }),
      entry({
        id: "entry-a",
        plannedFor: "2026-12-31",
        recipeId: "recipe-a",
        title: "Same title"
      }),
      entry({
        id: "entry-alpha",
        plannedFor: "2026-12-31",
        recipeId: "recipe-alpha",
        title: "Alpha"
      }),
      entry({
        id: "entry-a-2",
        plannedFor: "2027-01-02",
        recipeId: "recipe-a",
        title: "Same title"
      })
    ];

    const rows = buildMealPlanPrepSummary(entries).rows;

    expect(rows.map(({ recipeId }) => recipeId)).toEqual([
      "recipe-alpha",
      "recipe-a",
      "recipe-b",
      "recipe-z"
    ]);
    expect(rows[1]?.plannedDates).toEqual(["2026-12-31", "2027-01-02"]);
  });

  it("does not mutate the weekly query entries", () => {
    const entries = [
      entry({
        id: "entry-2",
        plannedFor: "2026-08-20",
        recipeId: "curry",
        title: "Curry"
      }),
      entry({
        id: "entry-1",
        plannedFor: "2026-08-18",
        recipeId: "curry",
        title: "Curry"
      })
    ];
    const originalEntries = structuredClone(entries);

    buildMealPlanPrepSummary(entries);

    expect(entries).toEqual(originalEntries);
  });

  it("returns an empty summary for an empty week", () => {
    expect(buildMealPlanPrepSummary([])).toEqual({
      rows: [],
      totalPlannedServings: 0
    });
  });
});

describe("meal planner prep scale formatting", () => {
  it.each([
    [2, 4, "0.5×"],
    [2, 2, "1×"],
    [5, 4, "1.25×"],
    [1, 8, "0.125×"],
    [1, 3, "1/3×"],
    [2, 6, "1/3×"],
    [4, 3, "4/3×"]
  ])(
    "formats %i planned servings from a yield of %i as %s",
    (total, savedYield, expected) => {
      expect(formatMealPlanPrepScale(total, savedYield)).toBe(expected);
    }
  );
});
