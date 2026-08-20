import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/query-keys";

const mocks = vi.hoisted(() => ({
  addMealPlanEntry: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
  getMealPlanWeek: vi.fn(),
  listMealPlanRecipeOptions: vi.fn(),
  removeMealPlanEntry: vi.fn(),
  restoreMealPlanEntry: vi.fn(),
  updateMealPlanEntry: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient
}));

vi.mock("../meal-planning.repository", () => ({
  addMealPlanEntry: mocks.addMealPlanEntry,
  getMealPlanWeek: mocks.getMealPlanWeek,
  listMealPlanRecipeOptions: mocks.listMealPlanRecipeOptions,
  removeMealPlanEntry: mocks.removeMealPlanEntry,
  restoreMealPlanEntry: mocks.restoreMealPlanEntry,
  updateMealPlanEntry: mocks.updateMealPlanEntry
}));

import {
  useAddMealPlanEntry,
  useMealPlanRecipeOptions,
  useMealPlanWeek,
  useRemoveMealPlanEntry,
  useRestoreMealPlanEntry,
  useUpdateMealPlanEntry
} from "../meal-planning.queries";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("meal planner queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseBrowserClient.mockReturnValue({ client: "supabase" });
  });

  it("loads a week under its exact Monday cache key", async () => {
    const week = {
      entries: [],
      planId: null,
      weekStartDate: "2026-08-17"
    };
    mocks.getMealPlanWeek.mockResolvedValue(week);
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useMealPlanWeek("2026-08-17"),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(week);
    expect(mocks.getMealPlanWeek).toHaveBeenCalledWith(
      { client: "supabase" },
      "2026-08-17"
    );
    expect(
      queryClient.getQueryData(queryKeys.mealPlanning.week("2026-08-17"))
    ).toEqual(week);
  });

  it("filters the one cached recipe list by title or ingredient", async () => {
    mocks.listMealPlanRecipeOptions.mockResolvedValue([
      {
        archived: false,
        id: "recipe-1",
        ingredientNames: ["Tomato", "Rice"],
        mealTypes: ["lunch"],
        servings: 2,
        title: "Red bowl"
      },
      {
        archived: false,
        id: "recipe-2",
        ingredientNames: ["Egg"],
        mealTypes: ["breakfast"],
        servings: 1,
        title: "Omelette"
      }
    ]);
    const queryClient = createQueryClient();
    const { result, rerender } = renderHook(
      ({ search }) => useMealPlanRecipeOptions(search),
      {
        initialProps: { search: " rice " },
        wrapper: createWrapper(queryClient)
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(({ id }) => id)).toEqual(["recipe-1"]);

    rerender({ search: "OME" });

    await waitFor(() =>
      expect(result.current.data?.map(({ id }) => id)).toEqual(["recipe-2"])
    );
    expect(mocks.listMealPlanRecipeOptions).toHaveBeenCalledTimes(1);
  });

  it("invalidates only the changed week after entry mutations", async () => {
    mocks.addMealPlanEntry.mockResolvedValue({ id: "entry-1" });
    mocks.removeMealPlanEntry.mockResolvedValue({ recipeId: "recipe-1" });
    mocks.restoreMealPlanEntry.mockResolvedValue({ id: "entry-2" });
    mocks.updateMealPlanEntry.mockResolvedValue({ id: "entry-1" });
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const { result: addResult } = renderHook(() => useAddMealPlanEntry(), {
      wrapper
    });
    const { result: removeResult } = renderHook(() => useRemoveMealPlanEntry(), {
      wrapper
    });
    const { result: restoreResult } = renderHook(
      () => useRestoreMealPlanEntry(),
      { wrapper }
    );
    const { result: updateResult } = renderHook(
      () => useUpdateMealPlanEntry(),
      { wrapper }
    );
    const addInput = {
      mealType: "dinner" as const,
      plannedFor: "2026-08-19" as const,
      recipeId: "recipe-1",
      servings: 2,
      weekStartDate: "2026-08-17" as const
    };

    await act(async () => {
      await addResult.current.mutateAsync(addInput);
      await removeResult.current.mutateAsync({
        entryId: "entry-1",
        weekStartDate: "2026-08-17"
      });
      await restoreResult.current.mutateAsync(addInput);
      await updateResult.current.mutateAsync({
        entryId: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-20",
        servings: 3,
        weekStartDate: "2026-08-17"
      });
    });

    expect(mocks.addMealPlanEntry).toHaveBeenCalledWith(
      { client: "supabase" },
      addInput
    );
    expect(mocks.restoreMealPlanEntry).toHaveBeenCalledWith(
      { client: "supabase" },
      addInput
    );
    expect(mocks.updateMealPlanEntry).toHaveBeenCalledWith(
      { client: "supabase" },
      {
        entryId: "entry-1",
        mealType: "lunch",
        plannedFor: "2026-08-20",
        servings: 3,
        weekStartDate: "2026-08-17"
      }
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.mealPlanning.week("2026-08-17")
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.mealPlanning.week("2026-08-17")
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: queryKeys.mealPlanning.week("2026-08-17")
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(4, {
      queryKey: queryKeys.mealPlanning.week("2026-08-17")
    });
  });
});
