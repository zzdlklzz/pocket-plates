import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RecipeListFilters } from "./recipe.types";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export async function listRecipes(
  supabase: SupabaseBrowserClient,
  filters: RecipeListFilters
) {
  let query = supabase
    .from("recipes")
    .select("id,title,cost_rating,difficulty,image_url,created_at")
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}
