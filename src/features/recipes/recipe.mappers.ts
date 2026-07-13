import type { MealType, RecipeCardDto, RecipeDetailDto, RecipeFormValues } from "./recipe.types";

export type RecipeListRow = {
  id: string;
  title: string;
  cost_rating: RecipeCardDto["costRating"];
  difficulty: RecipeCardDto["difficulty"];
  image_url: string | null;
  recipe_meal_types?: { meal_type: MealType }[] | null;
};

export type RecipeDetailRow = RecipeListRow & {
  servings: number;
  notes: string | null;
  source_url: string | null;
  recipe_links?: {
    label: string | null;
    sort_order: number;
    url: string;
  }[] | null;
  recipe_ingredients?: {
    amount: number | null;
    name: string;
    notes: string | null;
    sort_order: number;
    unit: string | null;
  }[] | null;
  recipe_steps?: {
    instruction: string;
    sort_order: number;
  }[] | null;
};

export function toRecipeCardDto(row: RecipeListRow): RecipeCardDto {
  return {
    id: row.id,
    title: row.title,
    costRating: row.cost_rating,
    difficulty: row.difficulty,
    imageUrl: row.image_url,
    mealTypes: row.recipe_meal_types?.map(({ meal_type }) => meal_type) ?? []
  };
}

export function toRecipeDetailDto(row: RecipeDetailRow): RecipeDetailDto {
  return {
    ...toRecipeCardDto(row),
    servings: row.servings,
    notes: row.notes,
    sourceLinks: row.recipe_links?.length
      ? row.recipe_links
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map(({ label, url }) => ({ label, url }))
      : row.source_url
        ? [{ label: null, url: row.source_url }]
        : [],
    ingredients:
      row.recipe_ingredients
        ?.slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map(({ amount, name, notes, unit }) => ({ amount, name, notes, unit })) ?? [],
    steps:
      row.recipe_steps
        ?.slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map(({ instruction }) => ({ instruction })) ?? []
  };
}

export function toRecipeFormValues(recipe: RecipeDetailDto): RecipeFormValues {
  return {
    title: recipe.title,
    servings: recipe.servings,
    mealTypes: recipe.mealTypes,
    costRating: recipe.costRating ?? "",
    difficulty: recipe.difficulty ?? "",
    imageUrl: recipe.imageUrl ?? "",
    sourceLinks: recipe.sourceLinks.map(({ label, url }) => ({ label: label ?? "", url })),
    notes: recipe.notes ?? "",
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount?.toString() ?? "",
      unit: ingredient.unit ?? "",
      notes: ingredient.notes ?? ""
    })),
    steps: recipe.steps.map((step) => ({
      instruction: step.instruction
    }))
  };
}
