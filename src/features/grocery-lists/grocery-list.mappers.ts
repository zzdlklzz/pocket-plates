import type {
  IsoDate,
  MealPlanEntryDto,
  MealType
} from "@/features/meal-planning/meal-planning.types";
import {
  buildMealPlanPrepSummary,
  formatMealPlanPrepScale
} from "@/features/meal-planning/meal-planning.prep";
import {
  getWeekStart,
  isDateInWeek,
  parseIsoDate
} from "@/features/meal-planning/meal-planning.dates";
import {
  buildGroceryRequirementGroups,
  generateGroceryListItems
} from "./grocery-list.generation";
import type {
  GroceryListDetailDto,
  GroceryListItemDto,
  GroceryListItemSourceDto,
  GroceryListGenerationRecipeInput,
  MealPlanGrocerySourceDto,
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

export type MealPlanGroceryRecipeRow = GroceryListGenerationRecipeRow & {
  archived_at: string | null;
};

export type MealPlanGroceryEntryRow = {
  id: string;
  meal_type: MealType;
  planned_for: string;
  recipe_id: string;
  recipes: MealPlanGroceryRecipeRow | null;
  servings: number;
};

export type MealPlanGrocerySourceRow = {
  id: string;
  meal_plan_entries: MealPlanGroceryEntryRow[] | null;
  week_start_date: string;
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
  notes: string | null;
  quantity_overridden: boolean;
  sort_order: number;
  unit: string | null;
};

export type GroceryListDetailRow = {
  grocery_list_items: GroceryListItemRow[] | null;
  id: string;
  meal_plans: { id: string } | null;
  source_recipe_count: number;
  source_type: GroceryListSourceType;
  source_week_start_date: string | null;
  title: string;
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

function toMealPlanEntryDto(
  planId: string,
  weekStartDate: IsoDate,
  row: MealPlanGroceryEntryRow
): MealPlanEntryDto | null {
  const recipe = row.recipes;
  const plannedFor = parseIsoDate(row.planned_for);

  if (!recipe || !plannedFor || !isDateInWeek(row.planned_for, weekStartDate)) {
    return null;
  }

  return {
    id: row.id,
    mealType: row.meal_type,
    planId,
    plannedFor: row.planned_for as IsoDate,
    recipe: {
      archived: recipe.archived_at !== null,
      id: recipe.id,
      servings: recipe.servings,
      title: recipe.title
    },
    servings: row.servings
  };
}

export function toMealPlanGrocerySourceDto(
  row: MealPlanGrocerySourceRow,
  allowEmpty = false
): MealPlanGrocerySourceDto | null {
  const parsedWeekStart = parseIsoDate(row.week_start_date);
  if (!parsedWeekStart || getWeekStart(parsedWeekStart) !== row.week_start_date) {
    return null;
  }

  const entryRows = row.meal_plan_entries ?? [];
  const entries = entryRows.flatMap((entry) => {
    const mapped = toMealPlanEntryDto(
      row.id,
      row.week_start_date as IsoDate,
      entry
    );
    return mapped ? [mapped] : [];
  });

  if (
    entries.length !== entryRows.length ||
    (!allowEmpty && entries.length === 0)
  ) {
    return null;
  }

  if (entries.length === 0) {
    return {
      generatedItems: [],
      mealPlanId: row.id,
      recipes: [],
      weekStartDate: row.week_start_date as IsoDate
    };
  }

  const prepSummary = buildMealPlanPrepSummary(entries);
  const recipeRowsById = new Map<string, MealPlanGroceryRecipeRow>();

  for (const entry of entryRows) {
    if (entry.recipes) {
      recipeRowsById.set(entry.recipe_id, entry.recipes);
    }
  }

  const generationRecipes = prepSummary.rows.flatMap((prepRow, index) => {
    const recipeRow = recipeRowsById.get(prepRow.recipeId);
    if (!recipeRow?.recipe_ingredients?.length) {
      return [];
    }

    return [
      toGroceryListGenerationRecipeInput(recipeRow, {
        recipeId: prepRow.recipeId,
        selectedRecipeOrder: index,
        targetServings: prepRow.totalPlannedServings
      })
    ];
  });

  if (generationRecipes.length !== prepSummary.rows.length) {
    return null;
  }

  return {
    generatedItems: generateGroceryListItems(generationRecipes),
    mealPlanId: row.id,
    recipes: prepSummary.rows.map((prepRow) => ({
      archived: prepRow.archived,
      plannedServings: prepRow.totalPlannedServings,
      recipeId: prepRow.recipeId,
      recipeTitle: prepRow.title,
      savedServings: prepRow.savedRecipeYield,
      scaleLabel: formatMealPlanPrepScale(
        prepRow.totalPlannedServings,
        prepRow.savedRecipeYield
      )
    })),
    weekStartDate: row.week_start_date as IsoDate
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
    notes: row.notes,
    quantityOverridden: row.quantity_overridden,
    requirementGroups: buildGroceryRequirementGroups(sources),
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
    sourceRecipeCount: row.source_recipe_count,
    sourceType: row.source_type,
    sourceWeekStartDate: row.source_week_start_date as IsoDate | null,
    title: row.title
  };
}
