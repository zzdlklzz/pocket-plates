import { describe, expect, it } from "vitest";
import {
  toGeneratedGroceryListRpcItems,
  toGroceryListDetailDto,
  toGroceryListGenerationRecipeInput,
  toGroceryListRecipeOptionDto,
  toGroceryListSummaryDto,
  toMealPlanGrocerySourceDto,
  type GroceryListDetailRow
} from "../grocery-list.mappers";

describe("grocery list mappers", () => {
  it("maps lightweight recipe options without database row shapes", () => {
    expect(
      toGroceryListRecipeOptionDto({
        id: "recipe-1",
        ingredient_names: ["Rice", "Pepper"],
        saved_servings: 4,
        title: "Curry"
      })
    ).toEqual({
      id: "recipe-1",
      ingredientNames: ["Rice", "Pepper"],
      savedServings: 4,
      title: "Curry"
    });
  });

  it("maps full sources in authoritative ingredient order", () => {
    expect(
      toGroceryListGenerationRecipeInput(
        {
          id: "recipe-1",
          recipe_ingredients: [
            {
              amount: 1,
              id: "ingredient-2",
              name: "Pepper",
              notes: null,
              sort_order: 1,
              unit: "tbsp"
            },
            {
              amount: 2,
              id: "ingredient-1",
              name: "Rice",
              notes: null,
              sort_order: 0,
              unit: "cups"
            }
          ],
          servings: 4,
          title: "Curry"
        },
        {
          recipeId: "recipe-1",
          selectedRecipeOrder: 2,
          targetServings: 8
        }
      )
    ).toEqual({
      ingredients: [
        {
          amount: 2,
          id: "ingredient-1",
          name: "Rice",
          notes: null,
          sortOrder: 0,
          unit: "cups"
        },
        {
          amount: 1,
          id: "ingredient-2",
          name: "Pepper",
          notes: null,
          sortOrder: 1,
          unit: "tbsp"
        }
      ],
      recipeId: "recipe-1",
      recipeTitle: "Curry",
      savedServings: 4,
      selectedRecipeOrder: 2,
      targetServings: 8
    });
  });

  it("reuses planner grouping for repeated archived recipe entries above 100 servings", () => {
    const recipe = {
      archived_at: "2026-08-20T10:00:00Z",
      id: "recipe-1",
      recipe_ingredients: [
        {
          amount: 2,
          id: "ingredient-1",
          name: "Rice",
          notes: null,
          sort_order: 0,
          unit: "cups"
        }
      ],
      servings: 4,
      title: "Archived curry"
    };

    const source = toMealPlanGrocerySourceDto({
      id: "plan-1",
      meal_plan_entries: [
        {
          id: "entry-2",
          meal_type: "dinner",
          planned_for: "2026-08-19",
          recipe_id: recipe.id,
          recipes: recipe,
          servings: 50
        },
        {
          id: "entry-1",
          meal_type: "lunch",
          planned_for: "2026-08-17",
          recipe_id: recipe.id,
          recipes: recipe,
          servings: 70
        }
      ],
      week_start_date: "2026-08-17"
    });

    expect(source?.recipes).toEqual([
      {
        archived: true,
        plannedServings: 120,
        recipeId: "recipe-1",
        recipeTitle: "Archived curry",
        savedServings: 4,
        scaleLabel: "30×"
      }
    ]);
    expect(source?.generatedItems[0]).toMatchObject({
      name: "Rice",
      sources: [
        {
          contributedAmount: 60,
          targetServings: 120
        }
      ]
    });
  });

  it("rejects an empty initial week but supports an empty refresh source", () => {
    const row = {
      id: "plan-1",
      meal_plan_entries: [],
      week_start_date: "2026-08-17"
    };

    expect(toMealPlanGrocerySourceDto(row)).toBeNull();
    expect(toMealPlanGrocerySourceDto(row, true)).toEqual({
      generatedItems: [],
      mealPlanId: "plan-1",
      recipes: [],
      weekStartDate: "2026-08-17"
    });
  });

  it("maps generated items to the exact atomic RPC payload", () => {
    expect(
      toGeneratedGroceryListRpcItems([
        {
          name: "Rice",
          normalizedName: "rice",
          requirementGroups: [],
          sortOrder: 0,
          sources: [
            {
              canonicalUnit: "cup",
              contributedAmount: 4,
              ingredientSortOrder: 0,
              original: {
                amount: 2,
                name: "Rice",
                notes: null,
                unit: "cups"
              },
              recipeId: "recipe-1",
              recipeIngredientId: "ingredient-1",
              recipeTitle: "Curry",
              savedServings: 4,
              scaleFactor: 2,
              selectedRecipeOrder: 0,
              sortOrder: 0,
              targetServings: 8
            }
          ]
        }
      ])
    ).toEqual([
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
            recipe_id: "recipe-1",
            recipe_ingredient_id: "ingredient-1",
            recipe_title: "Curry",
            saved_servings: 4,
            scale_factor: 2,
            sort_order: 0,
            target_servings: 8
          }
        ]
      }
    ]);
  });

  it("maps the lightweight list RPC result explicitly", () => {
    expect(
      toGroceryListSummaryDto({
        checked_item_count: 2,
        id: "list-1",
        item_count: 5,
        meal_plan_available: true,
        source_recipe_count: 0,
        source_type: "meal_plan",
        source_week_start_date: "2026-08-17",
        title: "Weekly shop",
        updated_at: "2026-08-21T10:00:00Z"
      })
    ).toEqual({
      checkedItemCount: 2,
      id: "list-1",
      itemCount: 5,
      mealPlanAvailable: true,
      sourceRecipeCount: 0,
      sourceType: "meal_plan",
      sourceWeekStartDate: "2026-08-17",
      title: "Weekly shop",
      updatedAt: "2026-08-21T10:00:00Z"
    });
  });

  it("sorts nested rows and reuses requirement grouping for snapshots", () => {
    const row: GroceryListDetailRow = {
      grocery_list_items: [
        {
          amount: null,
          checked: false,
          grocery_list_item_sources: [
            {
              canonical_unit: null,
              contributed_amount: null,
              id: "source-2",
              ingredient_amount: null,
              ingredient_name: "Pepper",
              ingredient_notes: null,
              ingredient_unit: null,
              recipe_id: null,
              recipe_ingredient_id: null,
              recipe_title: "Deleted stew",
              saved_servings: 2,
              scale_factor: 1,
              sort_order: 2,
              target_servings: 2
            },
            {
              canonical_unit: "tbsp",
              contributed_amount: 1,
              id: "source-1",
              ingredient_amount: 0.5,
              ingredient_name: "Pepper",
              ingredient_notes: "ground",
              ingredient_unit: "tbsp",
              recipe_id: "recipe-1",
              recipe_ingredient_id: "ingredient-1",
              recipe_title: "Curry",
              saved_servings: 2,
              scale_factor: 2,
              sort_order: 0,
              target_servings: 4
            }
          ],
          id: "item-2",
          is_manual: false,
          name: "Pepper",
          notes: null,
          quantity_overridden: false,
          sort_order: 2,
          unit: null
        },
        {
          amount: 1,
          checked: true,
          grocery_list_item_sources: null,
          id: "item-1",
          is_manual: true,
          name: "Milk",
          notes: null,
          quantity_overridden: false,
          sort_order: 0,
          unit: "bottle"
        }
      ],
      id: "list-1",
      meal_plans: { id: "plan-1" },
      source_recipe_count: 0,
      source_type: "meal_plan",
      source_week_start_date: "2026-08-17",
      title: "Weekly shop"
    };

    const detail = toGroceryListDetailDto(row);

    expect(detail.mealPlanAvailable).toBe(true);
    expect(detail.items.map(({ id }) => id)).toEqual(["item-1", "item-2"]);
    expect(detail.items[1]?.sources.map(({ id }) => id)).toEqual([
      "source-1",
      "source-2"
    ]);
    expect(detail.items[1]?.requirementGroups).toEqual([
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
    ]);
  });

  it("hides refresh availability when the linked week is gone", () => {
    expect(
      toGroceryListDetailDto({
        grocery_list_items: [],
        id: "list-1",
        meal_plans: null,
        source_recipe_count: 0,
        source_type: "meal_plan",
        source_week_start_date: "2026-08-17",
        title: "Old weekly shop"
      }).mealPlanAvailable
    ).toBe(false);
  });
});
