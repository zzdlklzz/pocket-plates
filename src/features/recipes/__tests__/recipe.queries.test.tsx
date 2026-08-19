import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/query-keys";

const mocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  getRecipeImageUrls: vi.fn(),
  listArchivedRecipes: vi.fn(),
  restoreRecipe: vi.fn()
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient
}));

vi.mock("../recipe-image.repository", () => ({
  getRecipeImageUrl: vi.fn(),
  getRecipeImageUrls: mocks.getRecipeImageUrls
}));

vi.mock("../recipe.repository", () => ({
  archiveRecipe: vi.fn(),
  createRecipe: vi.fn(),
  getRecipe: vi.fn(),
  listArchivedRecipes: mocks.listArchivedRecipes,
  listRecipes: vi.fn(),
  restoreRecipe: mocks.restoreRecipe,
  updateRecipe: vi.fn()
}));

import { useArchivedRecipeList, useRestoreRecipe } from "../recipe.queries";

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
  });
});
