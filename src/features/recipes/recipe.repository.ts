import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RecipeListRow } from "./recipe.mappers";
import type { RecipeListFilters } from "./recipe.types";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

const RECIPE_LIST_SELECT = "id,title,cost_rating,difficulty,image_url,created_at,recipe_meal_types(meal_type)";

export async function listRecipes(
  supabase: SupabaseBrowserClient,
  filters: RecipeListFilters
) {
  const mealTypes = filters.mealTypes?.length ? filters.mealTypes : null;
  let recipeIds: string[] | null = null;

  if (mealTypes) {
    const { data: matchingMealTypes, error } = await supabase
      .from("recipe_meal_types")
      .select("recipe_id")
      .in("meal_type", mealTypes);

    if (error) {
      throw error;
    }

    recipeIds = Array.from(new Set(matchingMealTypes.map(({ recipe_id }) => recipe_id)));

    if (recipeIds.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("recipes")
    .select(RECIPE_LIST_SELECT)
    .order("created_at", { ascending: false });

  const search = filters.search?.trim();

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (recipeIds) {
    query = query.in("id", recipeIds);
  }

  if (filters.costRatings?.length) {
    query = query.in("cost_rating", filters.costRatings);
  }

  if (filters.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as RecipeListRow[];
}
