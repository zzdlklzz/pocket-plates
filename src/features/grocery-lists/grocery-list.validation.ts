import { z } from "zod";
import { parseIngredientAmount } from "@/features/ingredients/ingredient-amount";
import { isRepresentableGroceryQuantity } from "./grocery-list.generation";
import {
  MAX_GROCERY_LIST_ITEM_NAME_LENGTH,
  MAX_GROCERY_LIST_ITEM_NOTE_LENGTH,
  MAX_GROCERY_LIST_RECIPES,
  MAX_GROCERY_LIST_TARGET_SERVINGS,
  MAX_GROCERY_LIST_TITLE_LENGTH,
  MAX_GROCERY_LIST_UNIT_LENGTH
} from "./grocery-list.constants";
import type { GroceryListItemValues } from "./grocery-list.types";
import type {
  CreateGeneratedGroceryListInput,
  SelectedGroceryListRecipeInput
} from "./grocery-list.types";

export const groceryListTitleSchema = z
  .string()
  .trim()
  .min(1, "Add a list name.")
  .max(
    MAX_GROCERY_LIST_TITLE_LENGTH,
    `Keep the list name under ${MAX_GROCERY_LIST_TITLE_LENGTH} characters.`
  );

const groceryListAmountSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }

      const amount = parseIngredientAmount(value);
      return amount !== null && isRepresentableGroceryQuantity(amount);
    },
    "Use a positive number or simple fraction, like 1, 1.5, 1/2, or 1 1/2."
  );

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

const selectedGroceryListRecipeSchema = z.object({
  recipeId: z.string().refine(isUuid, "A selected recipe is unavailable."),
  selectedRecipeOrder: z
    .number()
    .int("Recipe order must be a whole number.")
    .min(0, "Recipe order cannot be negative.")
    .max(MAX_GROCERY_LIST_RECIPES - 1, "Recipe order is outside the supported range."),
  targetServings: z
    .number()
    .int("Target servings must be a whole number.")
    .min(1, "Target servings must be at least 1.")
    .max(
      MAX_GROCERY_LIST_TARGET_SERVINGS,
      `Target servings must be ${MAX_GROCERY_LIST_TARGET_SERVINGS} or less.`
    )
});

export const selectedGroceryListRecipesSchema = z
  .array(selectedGroceryListRecipeSchema)
  .min(1, "Choose at least one recipe.")
  .max(
    MAX_GROCERY_LIST_RECIPES,
    `Choose no more than ${MAX_GROCERY_LIST_RECIPES} recipes.`
  )
  .superRefine((recipes, context) => {
    const recipeIds = new Set<string>();
    const recipeOrders = new Set<number>();

    recipes.forEach((recipe, index) => {
      if (recipeIds.has(recipe.recipeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose each recipe only once.",
          path: [index, "recipeId"]
        });
      }
      recipeIds.add(recipe.recipeId);

      if (recipeOrders.has(recipe.selectedRecipeOrder)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recipe order must be unique.",
          path: [index, "selectedRecipeOrder"]
        });
      }
      recipeOrders.add(recipe.selectedRecipeOrder);
    });
  });

export const createGeneratedGroceryListSchema = z.object({
  recipes: selectedGroceryListRecipesSchema,
  title: groceryListTitleSchema
});

export function parseSelectedGroceryListRecipes(
  recipes: SelectedGroceryListRecipeInput[]
) {
  return selectedGroceryListRecipesSchema
    .parse(recipes)
    .slice()
    .sort((left, right) => left.selectedRecipeOrder - right.selectedRecipeOrder);
}

export function parseCreateGeneratedGroceryListInput(
  input: CreateGeneratedGroceryListInput
) {
  const parsed = createGeneratedGroceryListSchema.parse(input);
  return {
    ...parsed,
    recipes: parsed.recipes
      .slice()
      .sort(
        (left, right) => left.selectedRecipeOrder - right.selectedRecipeOrder
      )
  };
}

export const groceryListItemSchema = z.object({
  amount: groceryListAmountSchema,
  name: z
    .string()
    .trim()
    .min(1, "Add an item name.")
    .max(
      MAX_GROCERY_LIST_ITEM_NAME_LENGTH,
      `Keep item names under ${MAX_GROCERY_LIST_ITEM_NAME_LENGTH} characters.`
    ),
  notes: z
    .string()
    .trim()
    .max(
      MAX_GROCERY_LIST_ITEM_NOTE_LENGTH,
      `Keep notes under ${MAX_GROCERY_LIST_ITEM_NOTE_LENGTH} characters.`
    ),
  unit: z
    .string()
    .trim()
    .max(
      MAX_GROCERY_LIST_UNIT_LENGTH,
      `Keep units under ${MAX_GROCERY_LIST_UNIT_LENGTH} characters.`
    )
});

export function parseGroceryListTitle(title: string) {
  return groceryListTitleSchema.parse(title);
}

export function parseGroceryListItemValues(values: GroceryListItemValues) {
  const parsed = groceryListItemSchema.parse(values);

  return {
    amount: parseIngredientAmount(parsed.amount),
    name: parsed.name,
    notes: parsed.notes || null,
    unit: parsed.unit || null
  };
}
