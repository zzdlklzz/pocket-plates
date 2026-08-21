import type { IsoDate } from "@/features/meal-planning/meal-planning.types";
import { buildGroceryRequirementGroups } from "./grocery-list.generation";
import type {
  GroceryListDetailDto,
  GroceryListItemDto,
  GroceryListItemSourceDto,
  GroceryListGenerationRecipeInput,
  GroceryListRecipeOptionDto,
  GroceryListSourceType,
  GroceryListSummaryDto,
  GeneratedGroceryListItem,
  GeneratedGroceryListRpcItem,
  SelectedGroceryListRecipeInput
} from "./grocery-list.types";

export type GroceryListRecipeOptionRow = {
  id: string;
  ingredient_names: string[];
  saved_servings: number;
  title: string;
};

export type GroceryListGenerationRecipeRow = {
  id: string;
  recipe_ingredients:
    | {
        amount: number | null;
        id: string;
        name: string;
        notes: string | null;
        sort_order: number;
        unit: string | null;
      }[]
    | null;
  servings: number;
  title: string;
};

export type GroceryListSummaryRow = {
  checked_item_count: number;
  id: string;
  item_count: number;
  meal_plan_available: boolean;
  source_recipe_count: number;
  source_type: GroceryListSourceType;
  source_week_start_date: string | null;
  title: string;
  updated_at: string;
};

export type GroceryListItemSourceRow = {
  canonical_unit: string | null;
  contributed_amount: number | null;
  id: string;
  ingredient_amount: number | null;
  ingredient_name: string;
  ingredient_notes: string | null;
  ingredient_unit: string | null;
  recipe_id: string | null;
  recipe_ingredient_id: string | null;
  recipe_title: string;
  saved_servings: number;
  scale_factor: number;
  sort_order: number;
  target_servings: number;
};

export type GroceryListItemRow = {
  amount: number | null;
  checked: boolean;
  grocery_list_item_sources: GroceryListItemSourceRow[] | null;
  id: string;
  is_manual: boolean;
  name: string;
  normalized_name: string;
  notes: string | null;
  quantity_overridden: boolean;
  sort_order: number;
  unit: string | null;
};

export type GroceryListDetailRow = {
  grocery_list_items: GroceryListItemRow[] | null;
  id: string;
  meal_plan_id: string | null;
  meal_plans: { id: string } | null;
  source_recipe_count: number;
  source_type: GroceryListSourceType;
  source_week_start_date: string | null;
  title: string;
  updated_at: string;
};

function compareOrderedRows(
  left: { id: string; sort_order: number },
  right: { id: string; sort_order: number }
) {
  return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
}

export function toGroceryListRecipeOptionDto(
  row: GroceryListRecipeOptionRow
): GroceryListRecipeOptionDto {
  return {
    id: row.id,
    ingredientNames: row.ingredient_names,
    savedServings: row.saved_servings,
    title: row.title
  };
}

export function toGroceryListGenerationRecipeInput(
  row: GroceryListGenerationRecipeRow,
  selection: SelectedGroceryListRecipeInput
): GroceryListGenerationRecipeInput {
  return {
    ingredients: (row.recipe_ingredients ?? [])
      .slice()
      .sort(compareOrderedRows)
      .map(({ amount, id, name, notes, sort_order, unit }) => ({
        amount,
        id,
        name,
        notes,
        sortOrder: sort_order,
        unit
      })),
    recipeId: row.id,
    recipeTitle: row.title,
    savedServings: row.servings,
    selectedRecipeOrder: selection.selectedRecipeOrder,
    targetServings: selection.targetServings
  };
}

export function toGeneratedGroceryListRpcItems(
  items: readonly GeneratedGroceryListItem[]
): GeneratedGroceryListRpcItem[] {
  return items.map((item) => ({
    name: item.name,
    sort_order: item.sortOrder,
    sources: item.sources.map((source) => ({
      canonical_unit: source.canonicalUnit,
      contributed_amount: source.contributedAmount,
      ingredient_amount: source.original.amount,
      ingredient_name: source.original.name,
      ingredient_notes: source.original.notes,
      ingredient_unit: source.original.unit,
      recipe_id: source.recipeId,
      recipe_ingredient_id: source.recipeIngredientId,
      recipe_title: source.recipeTitle,
      saved_servings: source.savedServings,
      scale_factor: source.scaleFactor,
      sort_order: source.sortOrder,
      target_servings: source.targetServings
    }))
  }));
}

export function toGroceryListSummaryDto(
  row: GroceryListSummaryRow
): GroceryListSummaryDto {
  return {
    checkedItemCount: row.checked_item_count,
    id: row.id,
    itemCount: row.item_count,
    mealPlanAvailable: row.meal_plan_available,
    sourceRecipeCount: row.source_recipe_count,
    sourceType: row.source_type,
    sourceWeekStartDate: row.source_week_start_date as IsoDate | null,
    title: row.title,
    updatedAt: row.updated_at
  };
}

export function toGroceryListItemSourceDto(
  row: GroceryListItemSourceRow
): GroceryListItemSourceDto {
  return {
    canonicalUnit: row.canonical_unit,
    contributedAmount: row.contributed_amount,
    id: row.id,
    original: {
      amount: row.ingredient_amount,
      name: row.ingredient_name,
      notes: row.ingredient_notes,
      unit: row.ingredient_unit
    },
    recipeId: row.recipe_id,
    recipeIngredientId: row.recipe_ingredient_id,
    recipeTitle: row.recipe_title,
    savedServings: row.saved_servings,
    scaleFactor: row.scale_factor,
    sortOrder: row.sort_order,
    targetServings: row.target_servings
  };
}

export function toGroceryListItemDto(row: GroceryListItemRow): GroceryListItemDto {
  const sources = (row.grocery_list_item_sources ?? [])
    .slice()
    .sort(compareOrderedRows)
    .map(toGroceryListItemSourceDto);

  return {
    amount: row.amount,
    checked: row.checked,
    id: row.id,
    isManual: row.is_manual,
    name: row.name,
    normalizedName: row.normalized_name,
    notes: row.notes,
    quantityOverridden: row.quantity_overridden,
    requirementGroups: buildGroceryRequirementGroups(sources),
    sortOrder: row.sort_order,
    sources,
    unit: row.unit
  };
}

export function toGroceryListDetailDto(
  row: GroceryListDetailRow
): GroceryListDetailDto {
  return {
    id: row.id,
    items: (row.grocery_list_items ?? [])
      .slice()
      .sort(compareOrderedRows)
      .map(toGroceryListItemDto),
    mealPlanAvailable:
      row.source_type === "meal_plan" && row.meal_plans !== null,
    mealPlanId: row.meal_plan_id,
    sourceRecipeCount: row.source_recipe_count,
    sourceType: row.source_type,
    sourceWeekStartDate: row.source_week_start_date as IsoDate | null,
    title: row.title,
    updatedAt: row.updated_at
  };
}
