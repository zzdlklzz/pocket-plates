"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query/query-keys";
import { getRecipeImageUrl, getRecipeImageUrls } from "./recipe-image.repository";
import {
  archiveRecipe,
  createRecipe,
  deleteArchivedRecipes,
  getRecipe,
  listArchivedRecipes,
  listRecipes,
  normalizeRecipeListFilters,
  restoreRecipe,
  updateRecipe
} from "./recipe.repository";
import { toRecipeCardDto, toRecipeDetailDto } from "./recipe.mappers";
import type { RecipeListRow } from "./recipe.mappers";
import type { RecipeListFilters, RecipeSaveInput } from "./recipe.types";

async function mapRecipeCardsWithImages(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  rows: RecipeListRow[]
) {
  const imageUrls = await getRecipeImageUrls(
    supabase,
    rows.map((row) => ({
      legacyImageUrl: row.image_url,
      storagePath: row.image_storage_path
    }))
  );

  return rows.map((row, index) => toRecipeCardDto(row, imageUrls[index]));
}

export function useRecipeList(filters: RecipeListFilters) {
  const normalizedFilters = normalizeRecipeListFilters(filters);

  return useQuery({
    queryKey: queryKeys.recipes.list(normalizedFilters),
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = await listRecipes(supabase, normalizedFilters);
      return mapRecipeCardsWithImages(supabase, rows);
    },
    placeholderData: (previousData) => previousData
  });
}

export function useArchivedRecipeList() {
  return useQuery({
    queryKey: queryKeys.recipes.archivedList,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const rows = await listArchivedRecipes(supabase);
      return mapRecipeCardsWithImages(supabase, rows);
    }
  });
}

export function useRecipeDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const row = await getRecipe(supabase, id);
      if (!row) {
        return null;
      }

      const imageUrl = await getRecipeImageUrl(supabase, row.image_storage_path, row.image_url);
      return toRecipeDetailDto(row, imageUrl);
    }
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageChange, values }: RecipeSaveInput) => {
      const supabase = createSupabaseBrowserClient();
      return createRecipe(supabase, values, imageChange);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    }
  });
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageChange, values }: RecipeSaveInput) => {
      const supabase = createSupabaseBrowserClient();
      return updateRecipe(supabase, id, values, imageChange);
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

export function useRestoreRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createSupabaseBrowserClient();
      return restoreRecipe(supabase, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    }
  });
}

export function useDeleteArchivedRecipes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = createSupabaseBrowserClient();
      return deleteArchivedRecipes(supabase, ids);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
    }
  });
}
