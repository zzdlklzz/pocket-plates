import type { Database } from "@/lib/supabase/database.types";

export type CostRating = Database["public"]["Enums"]["cost_rating"];
export type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];
export type MealType = Database["public"]["Enums"]["meal_type"];

export type RecipeCardDto = {
  id: string;
  title: string;
  costRating: CostRating | null;
  difficulty: DifficultyLevel | null;
  imageUrl: string | null;
  mealTypes: MealType[];
};

export type RecipeListFilters = {
  search?: string;
  mealTypes?: MealType[];
  costRatings?: CostRating[];
  difficulty?: DifficultyLevel;
};
