import { describe, expect, it } from "vitest";
import {
  formatGroceryListQuantity,
  roundGroceryQuantity
} from "../grocery-list.generation";
import { toGroceryListItemDto } from "../grocery-list.mappers";
import {
  groceryListItemSchema,
  parseCreateMealPlanGroceryListInput,
  parseCreateGeneratedGroceryListInput,
  parseGroceryListItemValues,
  parseGroceryListTitle
} from "../grocery-list.validation";

const recipeId = (index: number) =>
  `22000000-0000-0000-0000-${index.toString().padStart(12, "0")}`;

describe("grocery list validation", () => {
  it("trims list and item text and parses shared ingredient amounts", () => {
    expect(parseGroceryListTitle("  Saturday shop  ")).toBe("Saturday shop");
    expect(
      parseGroceryListItemValues({
        amount: " 1 1/2 ",
        name: "  Whole milk  ",
        notes: "  full fat  ",
        unit: " bottle "
      })
    ).toEqual({
      amount: 1.5,
      name: "Whole milk",
      notes: "full fat",
      unit: "bottle"
    });
  });

  it("stores blank optional item fields as null", () => {
    expect(
      parseGroceryListItemValues({
        amount: "",
        name: "Pepper",
        notes: "   ",
        unit: ""
      })
    ).toEqual({ amount: null, name: "Pepper", notes: null, unit: null });
  });

  it("rejects invalid quantities and bounded fields", () => {
    expect(() =>
      groceryListItemSchema.parse({
        amount: "0",
        name: "Pepper",
        notes: "",
        unit: ""
      })
    ).toThrow("Use a positive number or simple fraction");
    expect(() => parseGroceryListTitle("   ")).toThrow("Add a list name");
    expect(() =>
      groceryListItemSchema.parse({
        amount: "",
        name: "x".repeat(121),
        notes: "",
        unit: ""
      })
    ).toThrow("Keep item names under 120 characters");
  });

  it.each(["0.0000001", "1e308"])(
    "rejects an amount that cannot be rendered after six-decimal rounding: %s",
    (amount) => {
      expect(() =>
        parseGroceryListItemValues({
          amount,
          name: "Pepper",
          notes: "",
          unit: "bag"
        })
      ).toThrow("Use a positive number or simple fraction");
    }
  );

  it("keeps an accepted amount renderable after save and detail mapping", () => {
    const saved = parseGroceryListItemValues({
      amount: "1/3",
      name: "Rice",
      notes: "",
      unit: "bag"
    });
    const item = toGroceryListItemDto({
      amount: saved.amount,
      checked: false,
      grocery_list_item_sources: [],
      id: "item-1",
      is_manual: true,
      name: saved.name,
      normalized_name: "rice",
      notes: saved.notes,
      quantity_overridden: false,
      sort_order: 0,
      unit: saved.unit
    });

    expect(roundGroceryQuantity(saved.amount!)).toBe(0.333333);
    expect(
      formatGroceryListQuantity({
        ...item,
        quantityOverridden: item.isManual || item.quantityOverridden
      })
    ).toBe("⅓ bag");
  });

  it("trims generated titles and canonicalizes selected recipe order", () => {
    expect(
      parseCreateGeneratedGroceryListInput({
        recipes: [
          { recipeId: recipeId(2), selectedRecipeOrder: 1, targetServings: 4 },
          { recipeId: recipeId(1), selectedRecipeOrder: 0, targetServings: 2 }
        ],
        title: "  Recipe groceries  "
      })
    ).toEqual({
      recipes: [
        { recipeId: recipeId(1), selectedRecipeOrder: 0, targetServings: 2 },
        { recipeId: recipeId(2), selectedRecipeOrder: 1, targetServings: 4 }
      ],
      title: "Recipe groceries"
    });
  });

  it("enforces selected recipe count, identity, order, and serving limits", () => {
    const parse = (recipes: Parameters<typeof parseCreateGeneratedGroceryListInput>[0]["recipes"]) =>
      parseCreateGeneratedGroceryListInput({ recipes, title: "Groceries" });

    expect(() => parse([])).toThrow("Choose at least one recipe");
    expect(() =>
      parse(
        Array.from({ length: 11 }, (_, index) => ({
          recipeId: recipeId(index + 1),
          selectedRecipeOrder: index,
          targetServings: 1
        }))
      )
    ).toThrow("Choose no more than 10 recipes");
    expect(() =>
      parse([
        { recipeId: recipeId(1), selectedRecipeOrder: 0, targetServings: 1 },
        { recipeId: recipeId(1), selectedRecipeOrder: 1, targetServings: 1 }
      ])
    ).toThrow("Choose each recipe only once");
    expect(() =>
      parse([
        { recipeId: recipeId(1), selectedRecipeOrder: 0, targetServings: 1 },
        { recipeId: recipeId(2), selectedRecipeOrder: 0, targetServings: 1 }
      ])
    ).toThrow("Recipe order must be unique");
    expect(() =>
      parse([
        { recipeId: recipeId(1), selectedRecipeOrder: 0, targetServings: 101 }
      ])
    ).toThrow("Target servings must be 100 or less");
    expect(() =>
      parse([
        { recipeId: "not-a-uuid", selectedRecipeOrder: 0, targetServings: 1 }
      ])
    ).toThrow("A selected recipe is unavailable");
  });

  it("accepts only a normalized Monday for meal-plan generation", () => {
    expect(
      parseCreateMealPlanGroceryListInput({
        title: "  Weekly shop  ",
        weekStartDate: "2026-08-17"
      })
    ).toEqual({ title: "Weekly shop", weekStartDate: "2026-08-17" });
    expect(() =>
      parseCreateMealPlanGroceryListInput({
        title: "Weekly shop",
        weekStartDate: "2026-08-18"
      })
    ).toThrow("Choose a valid meal-plan week");
  });
});
