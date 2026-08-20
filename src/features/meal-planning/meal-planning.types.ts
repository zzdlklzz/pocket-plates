import type { Database } from "@/lib/supabase/database.types";

export type IsoDate = `${number}-${number}-${number}`;

export type MealType = Database["public"]["Enums"]["meal_type"];

export type MealPlanWeekDates = readonly [
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate
];

export type MealPlanRecipeSummary = {
  archived: boolean;
  id: string;
  servings: number;
  title: string;
};

export type MealPlanEntryDto = {
  id: string;
  mealType: MealType;
  planId: string;
  plannedFor: IsoDate;
  recipe: MealPlanRecipeSummary;
  servings: number;
};

export type MealPlanWeekDto = {
  entries: MealPlanEntryDto[];
  planId: string | null;
  weekStartDate: IsoDate;
};

export type MealPlanRecipeOptionDto = MealPlanRecipeSummary & {
  archived: false;
  ingredientNames: string[];
  mealTypes: MealType[];
};

export type AddMealPlanEntryInput = {
  mealType: MealType;
  plannedFor: IsoDate;
  recipeId: string;
  servings: number;
  weekStartDate: IsoDate;
};

export type RemoveMealPlanEntryInput = {
  entryId: string;
  weekStartDate: IsoDate;
};

export type RemovedMealPlanEntry = AddMealPlanEntryInput;
