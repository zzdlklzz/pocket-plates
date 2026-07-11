"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query/query-keys";
import { archiveRecipe, createRecipe, getRecipe, listRecipes, updateRecipe } from "./recipe.repository";
import { toRecipeCardDto, toRecipeDetailDto } from "./recipe.mappers";
import type { RecipeFormValues, RecipeListFilters } from "./recipe.types";

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

export function useRecipeDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const row = await getRecipe(supabase, id);
      return row ? toRecipeDetailDto(row) : null;
    }
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: RecipeFormValues) => {
      const supabase = createSupabaseBrowserClient();
      return createRecipe(supabase, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    }
  });
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: RecipeFormValues) => {
      const supabase = createSupabaseBrowserClient();
      return updateRecipe(supabase, id, values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) })
      ]);
    }
  });
}

export function useArchiveRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createSupabaseBrowserClient();
      return archiveRecipe(supabase, id);
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) })
      ]);
    }
  });
}
