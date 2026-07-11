import { describe, expect, it } from "vitest";
import { toRecipeCardDto, toRecipeDetailDto, toRecipeFormValues } from "../recipe.mappers";
import { recipeFormSchema } from "../recipe.validation";

describe("toRecipeCardDto", () => {
  it("maps database row names to app DTO names", () => {
    expect(
      toRecipeCardDto({
        id: "recipe-1",
        title: "Rice Bowl",
        cost_rating: "cheap",
        difficulty: "easy",
        image_url: null,
        recipe_meal_types: [{ meal_type: "dinner" }, { meal_type: "flexible" }]
      })
    ).toEqual({
      id: "recipe-1",
      title: "Rice Bowl",
      costRating: "cheap",
      difficulty: "easy",
      imageUrl: null,
      mealTypes: ["dinner", "flexible"]
    });
  });
});

describe("toRecipeDetailDto", () => {
  it("sorts child rows and maps detail fields", () => {
    expect(
      toRecipeDetailDto({
        id: "recipe-1",
        title: "Rice Bowl",
        cost_rating: "cheap",
        difficulty: "easy",
        image_url: null,
        notes: "Use leftover rice.",
        servings: 2,
        source_url: "https://example.com/rice-bowl",
        recipe_meal_types: [{ meal_type: "dinner" }],
        recipe_ingredients: [
          { amount: 1, name: "Egg", notes: null, sort_order: 1, unit: null },
          { amount: 2, name: "Rice", notes: "cooked", sort_order: 0, unit: "cups" }
        ],
        recipe_steps: [
          { instruction: "Serve warm.", sort_order: 1, timer_minutes: null },
          { instruction: "Fry everything.", sort_order: 0, timer_minutes: 8 }
        ]
      })
    ).toMatchObject({
      title: "Rice Bowl",
      servings: 2,
      sourceUrl: "https://example.com/rice-bowl",
      ingredients: [
        { amount: 2, name: "Rice", notes: "cooked", unit: "cups" },
        { amount: 1, name: "Egg", notes: null, unit: null }
      ],
      steps: [
        { instruction: "Fry everything.", timerMinutes: 8 },
        { instruction: "Serve warm.", timerMinutes: null }
      ]
    });
  });
});

describe("toRecipeFormValues", () => {
  it("converts nullable recipe detail fields to editable form values", () => {
    expect(
      toRecipeFormValues({
        id: "recipe-1",
        title: "Rice Bowl",
        costRating: null,
        difficulty: null,
        imageUrl: null,
        mealTypes: ["dinner"],
        servings: 2,
        notes: null,
        sourceUrl: null,
        ingredients: [{ amount: 2, name: "Rice", notes: null, unit: "cups" }],
        steps: [{ instruction: "Cook rice.", timerMinutes: null }]
      })
    ).toEqual({
      title: "Rice Bowl",
      servings: 2,
      mealTypes: ["dinner"],
      costRating: "",
      difficulty: "",
      imageUrl: "",
      sourceUrl: "",
      notes: "",
      ingredients: [{ amount: "2", name: "Rice", notes: "", unit: "cups" }],
      steps: [{ instruction: "Cook rice.", timerMinutes: "" }]
    });
  });
});

describe("recipeFormSchema", () => {
  it("requires the MVP recipe fields", () => {
    const result = recipeFormSchema.safeParse({
      title: "",
      servings: 0,
      mealTypes: [],
      costRating: "",
      difficulty: "",
      imageUrl: "",
      sourceUrl: "",
      notes: "",
      ingredients: [],
      steps: []
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        title: ["Add a recipe title."],
        servings: ["Servings must be at least 1."],
        mealTypes: ["Choose at least one meal type."],
        ingredients: ["Add at least one ingredient."],
        steps: ["Add at least one step."]
      });
    }
  });

  it("allows empty optional urls but rejects partial urls", () => {
    const baseValues = {
      title: "Rice Bowl",
      servings: 2,
      mealTypes: ["dinner"],
      costRating: "",
      difficulty: "",
      imageUrl: "",
      sourceUrl: "",
      notes: "",
      ingredients: [{ amount: "", name: "Rice", notes: "", unit: "" }],
      steps: [{ instruction: "Cook rice.", timerMinutes: "" }]
    };

    expect(recipeFormSchema.safeParse(baseValues).success).toBe(true);
    expect(recipeFormSchema.safeParse({ ...baseValues, sourceUrl: "example.com" }).success).toBe(false);
  });
});
