"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addMealPlanEntry,
  addMealPlanEntries,
  getMealPlanWeek,
  listMealPlanRecipeOptions,
  removeMealPlanEntry,
  previewMealPlanEntries,
  restoreMealPlanEntry,
  updateMealPlanEntry
} from "./meal-planning.repository";
import type { MealPlanPasteInput } from "./meal-planning.copy";
import type {
  AddMealPlanEntryInput,
  IsoDate,
  RemoveMealPlanEntryInput,
  RemovedMealPlanEntry,
  UpdateMealPlanEntryInput
} from "./meal-planning.types";

function normalizeRecipeSearch(search: string) {
  return search.trim().toLowerCase();
}

function matchesRecipeSearch(
  recipe: { ingredientNames: string[]; title: string },
  search: string
) {
  return (
    !search ||
    recipe.title.toLowerCase().includes(search) ||
    recipe.ingredientNames.some((ingredient) =>
      ingredient.toLowerCase().includes(search)
    )
  );
}

export function useMealPlanWeek(weekStartDate: IsoDate) {
  return useQuery({
    queryKey: queryKeys.mealPlanning.week(weekStartDate),
    queryFn: () =>
      getMealPlanWeek(createSupabaseBrowserClient(), weekStartDate)
  });
}

export function useMealPlanRecipeOptions(search: string) {
  const normalizedSearch = normalizeRecipeSearch(search);

  return useQuery({
    queryKey: queryKeys.recipes.mealPlanOptions,
    queryFn: () => listMealPlanRecipeOptions(createSupabaseBrowserClient()),
    select: (recipes) =>
      recipes.filter((recipe) => matchesRecipeSearch(recipe, normalizedSearch))
  });
}

export function useAddMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddMealPlanEntryInput) =>
      addMealPlanEntry(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlanning.week(input.weekStartDate)
      });
    }
  });
}

export function useRemoveMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveMealPlanEntryInput) =>
      removeMealPlanEntry(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlanning.week(input.weekStartDate)
      });
    }
  });
}

export function useRestoreMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemovedMealPlanEntry) =>
      restoreMealPlanEntry(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlanning.week(input.weekStartDate)
      });
    }
  });
}

export function useUpdateMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMealPlanEntryInput) =>
      updateMealPlanEntry(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlanning.week(input.weekStartDate)
      });
    }
  });
}

export function usePreviewMealPlanEntries() {
  return useMutation({
    mutationFn: (input: MealPlanPasteInput) =>
      previewMealPlanEntries(createSupabaseBrowserClient(), input)
  });
}

export function useAddMealPlanEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MealPlanPasteInput) =>
      addMealPlanEntries(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlanning.week(input.weekStartDate)
      });
    }
  });
}
