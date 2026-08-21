import { describe, expect, it } from "vitest";
import {
  toGroceryListDetailDto,
  toGroceryListSummaryDto,
  type GroceryListDetailRow
} from "../grocery-list.mappers";

describe("grocery list mappers", () => {
  it("maps the lightweight list RPC result explicitly", () => {
    expect(
      toGroceryListSummaryDto({
        checked_item_count: 2,
        id: "list-1",
        item_count: 5,
        meal_plan_available: true,
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
          normalized_name: "pepper",
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
          normalized_name: "milk",
          notes: null,
          quantity_overridden: false,
          sort_order: 0,
          unit: "bottle"
        }
      ],
      id: "list-1",
      meal_plan_id: "plan-1",
      meal_plans: { id: "plan-1" },
      source_type: "meal_plan",
      source_week_start_date: "2026-08-17",
      title: "Weekly shop",
      updated_at: "2026-08-21T10:00:00Z"
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
        meal_plan_id: null,
        meal_plans: null,
        source_type: "meal_plan",
        source_week_start_date: "2026-08-17",
        title: "Old weekly shop",
        updated_at: "2026-08-21T10:00:00Z"
      }).mealPlanAvailable
    ).toBe(false);
  });
});
