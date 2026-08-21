import type { IsoDate } from "@/features/meal-planning/meal-planning.types";

export type GroceryListSourceType = "manual" | "recipes" | "meal_plan";

export type GroceryListSummaryDto = {
  checkedItemCount: number;
  id: string;
  itemCount: number;
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
  mealPlanId: string | null;
  sourceType: GroceryListSourceType;
  sourceWeekStartDate: IsoDate | null;
  title: string;
  updatedAt: string;
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
