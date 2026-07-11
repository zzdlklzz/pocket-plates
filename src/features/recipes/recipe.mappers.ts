import type { MealType, RecipeCardDto } from "./recipe.types";

export type RecipeListRow = {
  id: string;
  title: string;
  cost_rating: RecipeCardDto["costRating"];
  difficulty: RecipeCardDto["difficulty"];
  image_url: string | null;
  recipe_meal_types?: { meal_type: MealType }[] | null;
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
