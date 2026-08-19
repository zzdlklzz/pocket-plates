import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe, updateRecipe } from "../recipe.repository";
import type { RecipeFormValues } from "../recipe.types";

const mocks = vi.hoisted(() => ({
  replaceRecipeDiscoveryMetadata: vi.fn()
}));

vi.mock("../recipe-discovery.repository", () => ({
  replaceRecipeDiscoveryMetadata: mocks.replaceRecipeDiscoveryMetadata
}));

const values: RecipeFormValues = {
  title: "Rice bowl",
  servings: 2,
  mealTypes: ["dinner"],
  costRating: "cheap",
  difficulty: "easy",
  effortLabels: ["quick", "one_pot"],
  equipmentKeys: ["microwave", "no_oven"],
  sourceLinks: [],
  notes: "",
  ingredients: [{ amount: "1", name: "Rice", notes: "", unit: "cup" }],
  steps: [{ instruction: "Cook the rice." }]
};

function createSupabaseMock() {
  const deleteRecipeEq = vi.fn().mockResolvedValue({ error: null });
  const updateRecipeEq = vi.fn().mockResolvedValue({ error: null });
  const childDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "recipes") {
      return {
        delete: vi.fn(() => ({ eq: deleteRecipeEq })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: "recipe-1" }, error: null })
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { image_storage_path: null },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({ eq: updateRecipeEq }))
      };
    }

    return {
      delete: vi.fn(() => ({ eq: childDeleteEq })),
      insert: vi.fn().mockResolvedValue({ error: null })
    };
  });

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null
        })
      },
      from
    },
    deleteRecipeEq
  };
}

describe("recipe discovery persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.replaceRecipeDiscoveryMetadata.mockResolvedValue(undefined);
  });

  it("persists effort and equipment once after creating ordinary recipe children", async () => {
    const { client } = createSupabaseMock();

    await expect(createRecipe(client as never, values, { type: "keep" })).resolves.toBe("recipe-1");

    expect(mocks.replaceRecipeDiscoveryMetadata).toHaveBeenCalledTimes(1);
    expect(mocks.replaceRecipeDiscoveryMetadata).toHaveBeenCalledWith(
      client,
      "recipe-1",
      ["quick", "one_pot"],
      ["microwave", "no_oven"]
    );
  });

  it("persists complete discovery selections during edit", async () => {
    const { client } = createSupabaseMock();

    await expect(updateRecipe(client as never, "recipe-1", values, { type: "keep" })).resolves.toBe(
      "recipe-1"
    );

    expect(mocks.replaceRecipeDiscoveryMetadata).toHaveBeenCalledTimes(1);
    expect(mocks.replaceRecipeDiscoveryMetadata).toHaveBeenCalledWith(
      client,
      "recipe-1",
      ["quick", "one_pot"],
      ["microwave", "no_oven"]
    );
  });

  it("rolls back a newly created recipe when effort persistence fails", async () => {
    const { client, deleteRecipeEq } = createSupabaseMock();
    const error = new Error("metadata failed");
    mocks.replaceRecipeDiscoveryMetadata.mockRejectedValue(error);

    await expect(createRecipe(client as never, values, { type: "keep" })).rejects.toBe(error);
    expect(deleteRecipeEq).toHaveBeenCalledWith("id", "recipe-1");
  });
});
