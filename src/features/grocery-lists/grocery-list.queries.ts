"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { IsoDate } from "@/features/meal-planning/meal-planning.types";
import {
  createGeneratedGroceryList,
  createMealPlanGroceryList,
  getMealPlanGrocerySource,
  listGroceryListRecipeOptions,
  previewSelectedRecipeGroceryList,
  refreshGroceryListFromWeek
} from "./grocery-list-generation.repository";
import {
  addGroceryListItem,
  createBlankGroceryList,
  deleteGroceryList,
  getGroceryListDetail,
  listGroceryLists,
  removeGroceryListItem,
  renameGroceryList,
  resetGroceryListChecklist,
  setGroceryListItemChecked,
  updateGroceryListItem
} from "./grocery-list.repository";
import type {
  AddGroceryListItemInput,
  CreateBlankGroceryListInput,
  CreateGeneratedGroceryListInput,
  CreateMealPlanGroceryListInput,
  DeleteGroceryListInput,
  GroceryListDetailDto,
  GroceryListSummaryDto,
  RemoveGroceryListItemInput,
  RenameGroceryListInput,
  ResetGroceryListChecklistInput,
  RefreshGroceryListFromWeekInput,
  SelectedGroceryListRecipeInput,
  SetGroceryListItemCheckedInput,
  UpdateGroceryListItemInput
} from "./grocery-list.types";

const GROCERY_LIST_CHECK_MUTATION_KEY = [
  "grocery-lists",
  "check-item"
] as const;

function useInvalidateGroceryList() {
  const queryClient = useQueryClient();

  return async (groceryListId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.groceryLists.list }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.groceryLists.detail(groceryListId)
      })
    ]);
  };
}

export function useGroceryLists() {
  return useQuery({
    queryKey: queryKeys.groceryLists.list,
    queryFn: () => listGroceryLists(createSupabaseBrowserClient())
  });
}

export function useGroceryListRecipeOptions(search: string) {
  const normalizedSearch = search.trim();
  return useQuery({
    queryKey: queryKeys.groceryLists.recipeOptionSearch(normalizedSearch),
    queryFn: () =>
      listGroceryListRecipeOptions(
        createSupabaseBrowserClient(),
        normalizedSearch
      )
  });
}

export function useSelectedRecipeGroceryPreview(
  recipes: SelectedGroceryListRecipeInput[]
) {
  return useQuery({
    enabled: recipes.length > 0,
    queryKey: queryKeys.groceryLists.recipePreview(recipes),
    queryFn: () =>
      previewSelectedRecipeGroceryList(
        createSupabaseBrowserClient(),
        recipes
      ),
    refetchOnMount: "always",
    staleTime: 0
  });
}

export function useMealPlanGrocerySource(weekStartDate: IsoDate | null) {
  return useQuery({
    enabled: weekStartDate !== null,
    queryKey: queryKeys.groceryLists.mealPlanSource(weekStartDate ?? ""),
    queryFn: () =>
      getMealPlanGrocerySource(createSupabaseBrowserClient(), weekStartDate!),
    refetchOnMount: "always",
    staleTime: 0
  });
}

export function useGroceryListDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.groceryLists.detail(id),
    queryFn: () => getGroceryListDetail(createSupabaseBrowserClient(), id)
  });
}

export function useCreateBlankGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBlankGroceryListInput) =>
      createBlankGroceryList(createSupabaseBrowserClient(), input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groceryLists.list
      });
    }
  });
}

export function useCreateGeneratedGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGeneratedGroceryListInput) =>
      createGeneratedGroceryList(createSupabaseBrowserClient(), input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groceryLists.list
      });
    }
  });
}

export function useCreateMealPlanGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMealPlanGroceryListInput) =>
      createMealPlanGroceryList(createSupabaseBrowserClient(), input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groceryLists.list
      });
    }
  });
}

export function useRefreshGroceryListFromWeek() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: RefreshGroceryListFromWeekInput) =>
      refreshGroceryListFromWeek(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}

export function useRenameGroceryList() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: RenameGroceryListInput) =>
      renameGroceryList(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}

export function useResetGroceryListChecklist() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: ResetGroceryListChecklistInput) =>
      resetGroceryListChecklist(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}

export function useDeleteGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteGroceryListInput) =>
      deleteGroceryList(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => {
      queryClient.removeQueries({
        queryKey: queryKeys.groceryLists.detail(input.groceryListId)
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groceryLists.list
      });
    }
  });
}

export function useAddGroceryListItem() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: AddGroceryListItemInput) =>
      addGroceryListItem(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}

export function useUpdateGroceryListItem() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: UpdateGroceryListItemInput) =>
      updateGroceryListItem(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}

export function useSetGroceryListItemChecked() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: GROCERY_LIST_CHECK_MUTATION_KEY,
    mutationFn: (input: SetGroceryListItemCheckedInput) =>
      setGroceryListItemChecked(createSupabaseBrowserClient(), input),
    onMutate: async (input) => {
      const detailKey = queryKeys.groceryLists.detail(input.groceryListId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.groceryLists.list })
      ]);

      let previousChecked: boolean | null = null;
      let checkedDelta = 0;
      let summaryDelta = 0;

      queryClient.setQueryData<GroceryListDetailDto | null>(
        detailKey,
        (detail) => {
          if (!detail) {
            return detail;
          }

          const item = detail.items.find(({ id }) => id === input.itemId);
          if (!item || item.checked === input.checked) {
            return detail;
          }

          previousChecked = item.checked;
          checkedDelta = input.checked ? 1 : -1;
          return {
            ...detail,
            items: detail.items.map((currentItem) =>
              currentItem.id === input.itemId
                ? { ...currentItem, checked: input.checked }
                : currentItem
            )
          };
        }
      );

      if (checkedDelta !== 0) {
        queryClient.setQueryData<GroceryListSummaryDto[]>(
          queryKeys.groceryLists.list,
          (summaries) =>
            summaries?.map((summary) => {
              if (summary.id !== input.groceryListId) {
                return summary;
              }

              const nextCheckedItemCount = Math.min(
                summary.itemCount,
                Math.max(0, summary.checkedItemCount + checkedDelta)
              );
              summaryDelta = nextCheckedItemCount - summary.checkedItemCount;
              return {
                ...summary,
                checkedItemCount: nextCheckedItemCount
              };
            })
        );
      }

      return { previousChecked, summaryDelta };
    },
    onError: (_error, input, context) => {
      if (!context || context.previousChecked === null) {
        return;
      }

      let itemRolledBack = false;
      queryClient.setQueryData<GroceryListDetailDto | null>(
        queryKeys.groceryLists.detail(input.groceryListId),
        (detail) => {
          if (!detail) {
            return detail;
          }

          const item = detail.items.find(({ id }) => id === input.itemId);
          if (!item || item.checked !== input.checked) {
            return detail;
          }

          itemRolledBack = true;
          return {
            ...detail,
            items: detail.items.map((currentItem) =>
              currentItem.id === input.itemId
                ? { ...currentItem, checked: context.previousChecked! }
                : currentItem
            )
          };
        }
      );

      if (itemRolledBack && context.summaryDelta !== 0) {
        queryClient.setQueryData<GroceryListSummaryDto[]>(
          queryKeys.groceryLists.list,
          (summaries) =>
            summaries?.map((summary) =>
              summary.id === input.groceryListId
                ? {
                    ...summary,
                    checkedItemCount: Math.min(
                      summary.itemCount,
                      Math.max(
                        0,
                        summary.checkedItemCount - context.summaryDelta
                      )
                    )
                  }
                : summary
            )
        );
      }
    },
    onSettled: async (_data, _error, input) => {
      if (
        queryClient.isMutating({
          mutationKey: GROCERY_LIST_CHECK_MUTATION_KEY,
          predicate: (mutation) =>
            (mutation.state.variables as
              | SetGroceryListItemCheckedInput
              | undefined)?.groceryListId === input.groceryListId
        }) > 1
      ) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.groceryLists.list }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.groceryLists.detail(input.groceryListId)
        })
      ]);
    }
  });
}

export function useRemoveGroceryListItem() {
  const invalidateGroceryList = useInvalidateGroceryList();

  return useMutation({
    mutationFn: (input: RemoveGroceryListItemInput) =>
      removeGroceryListItem(createSupabaseBrowserClient(), input),
    onSuccess: async (_, input) => invalidateGroceryList(input.groceryListId)
  });
}
