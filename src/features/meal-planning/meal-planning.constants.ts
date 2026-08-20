import { MAX_SERVINGS } from "@/features/recipes/recipe.constants";
import type { MealType } from "./meal-planning.types";

export const MEAL_TYPE_VALUES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "flexible"
] as const satisfies readonly MealType[];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  flexible: "Anytime"
};

export const MAX_PLANNED_SERVINGS = MAX_SERVINGS;
export const MAX_MEAL_PLAN_PASTE_ENTRIES = 100;
