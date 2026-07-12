import type { CostRating, DifficultyLevel, MealType } from "./recipe.types";

export const MEAL_TYPE_FILTERS: { label: string; value: MealType }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
  { label: "Flexible", value: "flexible" }
];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  flexible: "Flexible"
};

export const COST_RATING_FILTERS: { label: string; value: CostRating }[] = [
  { label: "Very cheap", value: "very_cheap" },
  { label: "Cheap", value: "cheap" },
  { label: "Moderate", value: "moderate" },
  { label: "Splurge", value: "splurge" }
];

export const COST_RATING_LABELS: Record<CostRating, string> = {
  very_cheap: "$",
  cheap: "$$",
  moderate: "$$$",
  splurge: "$$$$"
};

export const DIFFICULTY_FILTERS: { label: string; value: DifficultyLevel }[] = [
  { label: "Beginner", value: "beginner_friendly" },
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" }
];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner_friendly: "Beginner",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};
