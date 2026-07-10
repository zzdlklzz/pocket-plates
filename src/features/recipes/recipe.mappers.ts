import type { RecipeCardDto } from "./recipe.types";

type RecipeListRow = {
  id: string;
  title: string;
  cost_rating: RecipeCardDto["costRating"];
  difficulty: RecipeCardDto["difficulty"];
  image_url: string | null;
};

export function toRecipeCardDto(row: RecipeListRow): RecipeCardDto {
  return {
    id: row.id,
    title: row.title,
    costRating: row.cost_rating,
    difficulty: row.difficulty,
    imageUrl: row.image_url
  };
}
