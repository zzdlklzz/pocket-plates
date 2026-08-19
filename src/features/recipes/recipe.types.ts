import type { Database } from "@/lib/supabase/database.types";

export type CostRating = Database["public"]["Enums"]["cost_rating"];
export type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];
export type MealType = Database["public"]["Enums"]["meal_type"];
export type RecipeEffortLabel = Database["public"]["Enums"]["recipe_effort_label"];
export type EquipmentPresetKey =
  | "microwave"
  | "rice_cooker"
  | "stovetop"
  | "oven"
  | "blender"
  | "no_oven";

export type RecipeCardDto = {
  id: string;
  title: string;
  costRating: CostRating | null;
  difficulty: DifficultyLevel | null;
  imageUrl: string | null;
  mealTypes: MealType[];
};

export type RecipeIngredientDto = {
  name: string;
  amount: number | null;
  unit: string | null;
  notes: string | null;
};

export type RecipeStepDto = {
  instruction: string;
};

export type RecipeSourceLinkDto = {
  label: string | null;
  url: string;
};

export type RecipeDetailDto = RecipeCardDto & {
  imageStoragePath: string | null;
  servings: number;
  notes: string | null;
  effortLabels: RecipeEffortLabel[];
  equipmentKeys: EquipmentPresetKey[];
  sourceLinks: RecipeSourceLinkDto[];
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
};

export type RecipeFormValues = {
  title: string;
  servings: number;
  mealTypes: MealType[];
  costRating: CostRating | "";
  difficulty: DifficultyLevel | "";
  effortLabels: RecipeEffortLabel[];
  equipmentKeys: EquipmentPresetKey[];
  sourceLinks: {
    label: string;
    url: string;
  }[];
  notes: string;
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    notes: string;
  }[];
  steps: {
    instruction: string;
  }[];
};

export type RecipeImageChange =
  | { type: "keep" }
  | { type: "remove" }
  | { file: File; type: "replace" };

export type RecipeSaveInput = {
  imageChange: RecipeImageChange;
  values: RecipeFormValues;
};

export type RecipeListFilters = {
  search?: string;
  mealTypes?: MealType[];
  costRatings?: CostRating[];
  difficulty?: DifficultyLevel;
  effortLabels?: RecipeEffortLabel[];
  equipmentKeys?: EquipmentPresetKey[];
};
