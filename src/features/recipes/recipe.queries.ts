"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query/query-keys";
import { listRecipes } from "./recipe.repository";
import { toRecipeCardDto } from "./recipe.mappers";
import type { RecipeListFilters } from "./recipe.types";

export function useRecipeList(filters: RecipeListFilters) {
  return useQuery({
    queryKey: queryKeys.recipes.list(filters),
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = await listRecipes(supabase, filters);
      return rows.map(toRecipeCardDto);
    }
  });
}
