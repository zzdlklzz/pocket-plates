import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/query-keys";

const mocks = vi.hoisted(() => ({
  archiveRecipe: vi.fn(),
  createRecipe: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
  deleteArchivedRecipes: vi.fn(),
  getRecipeImageUrls: vi.fn(),
  listArchivedRecipes: vi.fn(),
  listRecipes: vi.fn(),
  restoreRecipe: vi.fn(),
  updateRecipe: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient
}));

vi.mock("../recipe-image.repository", () => ({
  getRecipeImageUrl: vi.fn(),
  getRecipeImageUrls: mocks.getRecipeImageUrls
}));

vi.mock("../recipe.repository", () => ({
  archiveRecipe: mocks.archiveRecipe,
  createRecipe: mocks.createRecipe,
  deleteArchivedRecipes: mocks.deleteArchivedRecipes,
  getRecipe: vi.fn(),
  listArchivedRecipes: mocks.listArchivedRecipes,
  listRecipes: mocks.listRecipes,
  normalizeRecipeListFilters: (filters: {
    costRatings?: string[];
    difficulty?: string;
    effortLabels?: string[];
    equipmentKeys?: string[];
    mealTypes?: string[];
    search?: string;
  }) => ({
    search: filters.search?.trim() || undefined,
    mealTypes: filters.mealTypes?.length ? Array.from(new Set(filters.mealTypes)).sort() : undefined,
    costRatings: filters.costRatings?.length ? Array.from(new Set(filters.costRatings)).sort() : undefined,
    difficulty: filters.difficulty,
    effortLabels: filters.effortLabels?.length ? Array.from(new Set(filters.effortLabels)).sort() : undefined,
    equipmentKeys: filters.equipmentKeys?.length ? Array.from(new Set(filters.equipmentKeys)).sort() : undefined
  }),
  restoreRecipe: mocks.restoreRecipe,
  updateRecipe: mocks.updateRecipe
}));

import {
  useArchiveRecipe,
  useArchivedRecipeList,
  useCreateRecipe,
  useDeleteArchivedRecipes,
  useRecipeList,
  useRestoreRecipe,
  useUpdateRecipe
} from "../recipe.queries";

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });
}

describe("archived recipe queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseBrowserClient.mockReturnValue({ client: "supabase" });
  });

  it("maps archived rows through batched private image URLs", async () => {
    const row = {
      id: "recipe-1",
      title: "Archived noodles",
      cost_rating: "cheap",
      difficulty: "easy",
      image_storage_path: "user-1/recipe-1/cover.webp",
      image_url: null,
      recipe_meal_types: [{ meal_type: "dinner" }]
    };
    mocks.listArchivedRecipes.mockResolvedValue([row]);
    mocks.getRecipeImageUrls.mockResolvedValue(["https://example.com/signed-cover"]);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useArchivedRecipeList(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listArchivedRecipes).toHaveBeenCalledWith({ client: "supabase" });
    expect(mocks.getRecipeImageUrls).toHaveBeenCalledWith(
      { client: "supabase" },
      [{ legacyImageUrl: null, storagePath: "user-1/recipe-1/cover.webp" }]
    );
    expect(result.current.data).toEqual([
      {
        id: "recipe-1",
        title: "Archived noodles",
        costRating: "cheap",
        difficulty: "easy",
        imageUrl: "https://example.com/signed-cover",
        mealTypes: ["dinner"]
      }
    ]);
  });

  it("invalidates all recipe queries after a successful restore", async () => {
    mocks.restoreRecipe.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRestoreRecipe(), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync("recipe-1");
    });

    expect(mocks.restoreRecipe).toHaveBeenCalledWith({ client: "supabase" }, "recipe-1");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.recipes.all });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipeOptions
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipePreviews
    });
  });

  it("invalidates all recipe queries after permanent deletion", async () => {
    mocks.deleteArchivedRecipes.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteArchivedRecipes(), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync(["recipe-1", "recipe-2"]);
    });

    expect(mocks.deleteArchivedRecipes).toHaveBeenCalledWith(
      { client: "supabase" },
      ["recipe-1", "recipe-2"]
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.recipes.all });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipeOptions
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipePreviews
    });
  });
});

describe("active recipe queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseBrowserClient.mockReturnValue({ client: "supabase" });
  });

  it("invalidates grocery source caches after active recipe mutations", async () => {
    mocks.createRecipe.mockResolvedValue("recipe-new");
    mocks.updateRecipe.mockResolvedValue(undefined);
    mocks.archiveRecipe.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const createHook = renderHook(() => useCreateRecipe(), { wrapper });
    const updateHook = renderHook(() => useUpdateRecipe("recipe-1"), {
      wrapper
    });
    const archiveHook = renderHook(() => useArchiveRecipe(), { wrapper });

    await act(async () => {
      await createHook.result.current.mutateAsync({} as never);
      await updateHook.result.current.mutateAsync({} as never);
      await archiveHook.result.current.mutateAsync("recipe-1");
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipeOptions
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groceryLists.recipePreviews
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.recipes.detail("recipe-1")
    });
  });

  it("normalizes list filters and maps RPC rows through batched images", async () => {
    mocks.listRecipes.mockResolvedValue([
      {
        id: "recipe-1",
        title: "Egg fried rice",
        cost_rating: "cheap",
        difficulty: "easy",
        image_storage_path: null,
        image_url: null,
        meal_types: ["dinner"]
      }
    ]);
    mocks.getRecipeImageUrls.mockResolvedValue([null]);
    const queryClient = createQueryClient();

    const { result } = renderHook(
      () =>
        useRecipeList({
          search: "  egg  ",
          mealTypes: ["lunch", "breakfast", "lunch"],
          costRatings: [],
          effortLabels: ["quick", "one_pot", "quick"],
          equipmentKeys: ["no_oven", "microwave", "no_oven"]
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listRecipes).toHaveBeenCalledWith(
      { client: "supabase" },
      {
        search: "egg",
        mealTypes: ["breakfast", "lunch"],
        costRatings: undefined,
        difficulty: undefined,
        effortLabels: ["one_pot", "quick"],
        equipmentKeys: ["microwave", "no_oven"]
      }
    );
    expect(result.current.data).toEqual([
      {
        id: "recipe-1",
        title: "Egg fried rice",
        costRating: "cheap",
        difficulty: "easy",
        imageUrl: null,
        mealTypes: ["dinner"]
      }
    ]);
  });
});
