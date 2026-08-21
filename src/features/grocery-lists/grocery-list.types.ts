import type { IsoDate } from "@/features/meal-planning/meal-planning.types";

export type GroceryListSourceType = "manual" | "recipes" | "meal_plan";

export type GroceryListSummaryDto = {
  checkedItemCount: number;
  id: string;
  itemCount: number;
  mealPlanAvailable: boolean;
  sourceRecipeCount: number;
  sourceType: GroceryListSourceType;
  sourceWeekStartDate: IsoDate | null;
  title: string;
  updatedAt: string;
};

export type GroceryListItemSourceDto = {
  canonicalUnit: string | null;
  contributedAmount: number | null;
  id: string;
  original: {
    amount: number | null;
    name: string;
    notes: string | null;
    unit: string | null;
  };
  recipeId: string | null;
  recipeIngredientId: string | null;
  recipeTitle: string;
  savedServings: number;
  scaleFactor: number;
  sortOrder: number;
  targetServings: number;
};

export type GroceryListRequirementGroupDto = {
  amount: number | null;
  contributionCount: number;
  displayUnit: string | null;
  key: string;
  kind: "measured" | "extra";
  sourceCount: number;
};

export type GroceryListItemDto = {
  amount: number | null;
  checked: boolean;
  id: string;
  isManual: boolean;
  name: string;
  normalizedName: string;
  notes: string | null;
  quantityOverridden: boolean;
  requirementGroups: GroceryListRequirementGroupDto[];
  sortOrder: number;
  sources: GroceryListItemSourceDto[];
  unit: string | null;
};

export type GroceryListDetailDto = {
  id: string;
  items: GroceryListItemDto[];
  mealPlanAvailable: boolean;
  mealPlanId: string | null;
  sourceRecipeCount: number;
  sourceType: GroceryListSourceType;
  sourceWeekStartDate: IsoDate | null;
  title: string;
  updatedAt: string;
};

export type GroceryListItemValues = {
  amount: string;
  name: string;
  notes: string;
  unit: string;
};

export type CreateBlankGroceryListInput = {
  title: string;
};

export type GroceryListRecipeOptionDto = {
  id: string;
  ingredientNames: string[];
  savedServings: number;
  title: string;
};

export type SelectedGroceryListRecipeInput = {
  recipeId: string;
  selectedRecipeOrder: number;
  targetServings: number;
};

export type CreateGeneratedGroceryListInput = {
  recipes: SelectedGroceryListRecipeInput[];
  title: string;
};

export type MealPlanGroceryRecipeDto = {
  archived: boolean;
  plannedServings: number;
  recipeId: string;
  recipeTitle: string;
  savedServings: number;
  scaleLabel: string;
};

export type MealPlanGrocerySourceDto = {
  generatedItems: GeneratedGroceryListItem[];
  mealPlanId: string;
  recipes: MealPlanGroceryRecipeDto[];
  weekStartDate: IsoDate;
};

export type CreateMealPlanGroceryListInput = {
  title: string;
  weekStartDate: IsoDate;
};

export type RefreshGroceryListFromWeekInput = {
  groceryListId: string;
};

export type GeneratedGroceryListRpcSource = {
  canonical_unit: string | null;
  contributed_amount: number | null;
  ingredient_amount: number | null;
  ingredient_name: string;
  ingredient_notes: string | null;
  ingredient_unit: string | null;
  recipe_id: string;
  recipe_ingredient_id: string;
  recipe_title: string;
  saved_servings: number;
  scale_factor: number;
  sort_order: number;
  target_servings: number;
};

export type GeneratedGroceryListRpcItem = {
  name: string;
  sort_order: number;
  sources: GeneratedGroceryListRpcSource[];
};

export type RenameGroceryListInput = {
  groceryListId: string;
  title: string;
};

export type AddGroceryListItemInput = {
  groceryListId: string;
  values: GroceryListItemValues;
};

export type UpdateGroceryListItemInput = AddGroceryListItemInput & {
  itemId: string;
  quantityOverridden: boolean;
};

export type SetGroceryListItemCheckedInput = {
  checked: boolean;
  groceryListId: string;
  itemId: string;
};

export type RemoveGroceryListItemInput = {
  groceryListId: string;
  itemId: string;
};

export type DeleteGroceryListInput = {
  groceryListId: string;
};

export type GroceryListGenerationIngredientInput = {
  amount: number | null;
  id: string;
  name: string;
  notes: string | null;
  sortOrder: number;
  unit: string | null;
};

export type GroceryListGenerationRecipeInput = {
  ingredients: readonly GroceryListGenerationIngredientInput[];
  recipeId: string;
  recipeTitle: string;
  savedServings: number;
  selectedRecipeOrder: number;
  targetServings: number;
};

export type GeneratedGroceryListItemSource = Omit<
  GroceryListItemSourceDto,
  "id" | "recipeId" | "recipeIngredientId"
> & {
  ingredientSortOrder: number;
  recipeId: string;
  recipeIngredientId: string;
  selectedRecipeOrder: number;
};

export type GeneratedGroceryListItem = {
  name: string;
  normalizedName: string;
  requirementGroups: GroceryListRequirementGroupDto[];
  sortOrder: number;
  sources: GeneratedGroceryListItemSource[];
};

export type GroceryListQuantityDisplayInput = {
  amount: number | null;
  quantityOverridden: boolean;
  requirementGroups: readonly GroceryListRequirementGroupDto[];
  unit: string | null;
};
