import type { DifficultyLevel } from "./recipe.types";

export type StarterRecipeCard = {
  title: string;
  cost: "$" | "$$" | "$$$" | "$$$$";
  difficulty: DifficultyLevel;
};

export const MEAL_FILTER_LABELS = ["All", "Breakfast", "Lunch", "Dinner"] as const;

export const STARTER_RECIPE_CARDS: StarterRecipeCard[] = [
  { title: "Rice Bowl", cost: "$", difficulty: "easy" },
  { title: "Pasta", cost: "$$", difficulty: "easy" },
  { title: "Oats", cost: "$", difficulty: "easy" },
  { title: "Curry", cost: "$$", difficulty: "medium" }
];
