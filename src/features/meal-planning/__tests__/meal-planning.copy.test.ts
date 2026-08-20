import { describe, expect, it } from "vitest";
import {
  classifyMealPlanPaste,
  createDayCopyBuffer,
  createWeekCopyBuffer,
  mapMealPlanCopyBuffer
} from "../meal-planning.copy";
import type { MealPlanEntryDto } from "../meal-planning.types";

function entry(
  id: string,
  plannedFor: MealPlanEntryDto["plannedFor"],
  recipeId: string,
  archived = false
): MealPlanEntryDto {
  return {
    id,
    mealType: "dinner",
    planId: "plan-1",
    plannedFor,
    recipe: {
      archived,
      id: recipeId,
      servings: 2,
      title: `Recipe ${recipeId}`
    },
    servings: 3
  };
}

describe("meal planner copy buffers", () => {
  const entries = [
    entry("entry-1", "2026-08-31", "recipe-1"),
    entry("entry-2", "2026-09-02", "recipe-2"),
    entry("entry-3", "2026-09-02", "recipe-3", true),
    entry("entry-4", "2026-09-06", "recipe-4")
  ];

  it("copies only active meals from the selected day", () => {
    expect(createDayCopyBuffer(entries, "2026-09-02")).toEqual({
      entries: [
        {
          mealType: "dinner",
          recipeId: "recipe-2",
          servings: 3
        }
      ],
      kind: "day"
    });
  });

  it("stores Monday-to-Sunday offsets and omits archived meals", () => {
    expect(createWeekCopyBuffer(entries, "2026-08-31")).toEqual({
      entries: [
        {
          dayOffset: 0,
          mealType: "dinner",
          recipeId: "recipe-1",
          servings: 3
        },
        {
          dayOffset: 2,
          mealType: "dinner",
          recipeId: "recipe-2",
          servings: 3
        },
        {
          dayOffset: 6,
          mealType: "dinner",
          recipeId: "recipe-4",
          servings: 3
        }
      ],
      kind: "week"
    });
  });

  it("maps a day buffer to one target day and a week across month boundaries", () => {
    const dayBuffer = createDayCopyBuffer(entries, "2026-09-02");
    const weekBuffer = createWeekCopyBuffer(entries, "2026-08-31");

    expect(
      mapMealPlanCopyBuffer(dayBuffer, {
        targetDate: "2026-09-10",
        weekStartDate: "2026-09-07"
      })
    ).toEqual([
      {
        mealType: "dinner",
        plannedFor: "2026-09-10",
        recipeId: "recipe-2",
        servings: 3
      }
    ]);
    expect(
      mapMealPlanCopyBuffer(weekBuffer, {
        weekStartDate: "2026-09-28"
      }).map(({ plannedFor }) => plannedFor)
    ).toEqual(["2026-09-28", "2026-09-30", "2026-10-04"]);
  });

  it("rejects day targets outside the selected week", () => {
    const buffer = createDayCopyBuffer(entries, "2026-09-02");

    expect(() =>
      mapMealPlanCopyBuffer(buffer, {
        targetDate: "2026-09-14",
        weekStartDate: "2026-09-07"
      })
    ).toThrow("within the selected week");
  });
});

describe("meal planner paste preview", () => {
  const candidates = [
    {
      mealType: "dinner" as const,
      plannedFor: "2026-08-17" as const,
      recipeId: "active-1",
      servings: 2
    },
    {
      mealType: "dinner" as const,
      plannedFor: "2026-08-18" as const,
      recipeId: "active-2",
      servings: 3
    },
    {
      mealType: "lunch" as const,
      plannedFor: "2026-08-19" as const,
      recipeId: "archived-1",
      servings: 2
    },
    {
      mealType: "breakfast" as const,
      plannedFor: "2026-08-20" as const,
      recipeId: "missing-1",
      servings: 1
    }
  ];
  const availability = [
    { recipeId: "active-1", status: "active" as const },
    { recipeId: "active-2", status: "active" as const },
    { recipeId: "archived-1", status: "archived" as const },
    { recipeId: "missing-1", status: "unavailable" as const }
  ];

  it("previews an empty target with unavailable recipes separated safely", () => {
    expect(classifyMealPlanPaste(candidates, [], availability)).toEqual({
      archivedCount: 1,
      deletedCount: 1,
      eligibleCount: 2,
      eligibleEntries: candidates.slice(0, 2),
      exactDuplicateCount: 0
    });
  });

  it("counts exact target and repeated-buffer matches without comparing servings", () => {
    const repeatedCandidates = [candidates[0], { ...candidates[1] }, { ...candidates[1], servings: 8 }];

    expect(
      classifyMealPlanPaste(
        repeatedCandidates,
        [
          {
            mealType: "dinner",
            plannedFor: "2026-08-17",
            recipeId: "active-1"
          }
        ],
        availability
      )
    ).toMatchObject({
      archivedCount: 0,
      deletedCount: 0,
      eligibleCount: 1,
      exactDuplicateCount: 2
    });
  });

  it("classifies archived and unavailable before duplicate matches", () => {
    expect(
      classifyMealPlanPaste(
        candidates.slice(2),
        candidates.slice(2).map(({ mealType, plannedFor, recipeId }) => ({
          mealType,
          plannedFor,
          recipeId
        })),
        availability
      )
    ).toMatchObject({
      archivedCount: 1,
      deletedCount: 1,
      eligibleCount: 0,
      exactDuplicateCount: 0
    });
  });
});
