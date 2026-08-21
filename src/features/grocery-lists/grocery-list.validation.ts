import { z } from "zod";
import { parseIngredientAmount } from "@/features/ingredients/ingredient-amount";
import { isRepresentableGroceryQuantity } from "./grocery-list.generation";
import {
  MAX_GROCERY_LIST_ITEM_NAME_LENGTH,
  MAX_GROCERY_LIST_ITEM_NOTE_LENGTH,
  MAX_GROCERY_LIST_TITLE_LENGTH,
  MAX_GROCERY_LIST_UNIT_LENGTH
} from "./grocery-list.constants";
import type { GroceryListItemValues } from "./grocery-list.types";

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
