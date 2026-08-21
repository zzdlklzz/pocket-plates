import { describe, expect, it } from "vitest";
import {
  countGroceryListSourceRecipes,
  formatCompactGroceryRequirements,
  formatGroceryListQuantity,
  formatGroceryQuantity,
  generateGroceryListItems,
  normalizeGroceryListItemName,
  roundGroceryQuantity
} from "../grocery-list.generation";
import type {
  GroceryListGenerationIngredientInput,
  GroceryListGenerationRecipeInput
} from "../grocery-list.types";

function ingredient(
  id: string,
  name: string,
  amount: number | null,
  unit: string | null,
  sortOrder = 0,
  notes: string | null = null
): GroceryListGenerationIngredientInput {
  return { amount, id, name, notes, sortOrder, unit };
}

function recipe(
  recipeId: string,
  ingredients: readonly GroceryListGenerationIngredientInput[],
  overrides: Partial<GroceryListGenerationRecipeInput> = {}
): GroceryListGenerationRecipeInput {
  return {
    ingredients,
    recipeId,
    recipeTitle: `Recipe ${recipeId}`,
    savedServings: 4,
    selectedRecipeOrder: Number(recipeId.match(/\d+/)?.[0] ?? 1) - 1,
    targetServings: 4,
    ...overrides
  };
}

describe("grocery-list name normalization", () => {
  it("only trims, collapses whitespace, and lowercases", () => {
    expect(normalizeGroceryListItemName("  PEPPER\n flakes  ")).toBe(
      "pepper flakes"
    );
    expect(normalizeGroceryListItemName("Black-pepper (ground)")).toBe(
      "black-pepper (ground)"
    );
  });

  it("groups case and whitespace variants without guessing synonyms", () => {
    const items = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", " Pepper ", 1, "tbsp")]),
      recipe("recipe-2", [
        ingredient("ingredient-2", "PEPPER", 2, "tbsp"),
        ingredient("ingredient-3", "black pepper", 1, "tbsp", 1)
      ])
    ]);

    expect(items.map(({ name, normalizedName }) => ({ name, normalizedName }))).toEqual([
      { name: "Pepper", normalizedName: "pepper" },
      { name: "black pepper", normalizedName: "black pepper" }
    ]);
  });
});

describe("grocery-list scaling", () => {
  it.each([
    [4, 4, 3, 1, 3],
    [2, 6, 3, 3, 9],
    [4, 1, 3, 0.25, 0.75],
    [3, 1, 1, 0.333333, 0.333333]
  ])(
    "scales %s saved servings to %s target servings",
    (savedServings, targetServings, amount, scaleFactor, contributedAmount) => {
      const [item] = generateGroceryListItems([
        recipe("recipe-1", [ingredient("ingredient-1", "Rice", amount, "cups")], {
          savedServings,
          targetServings
        })
      ]);

      expect(item.sources[0]).toMatchObject({ scaleFactor, contributedAmount });
      expect(item.requirementGroups[0].amount).toBe(contributedAmount);
    }
  );

  it("rounds contributions and totals to six decimal places", () => {
    const [item] = generateGroceryListItems([
      recipe(
        "recipe-1",
        [
          ingredient("ingredient-1", "Oil", 1, "ml"),
          ingredient("ingredient-2", "Oil", 1, "ml", 1)
        ],
        { savedServings: 3, targetServings: 1 }
      )
    ]);

    expect(item.sources.map(({ contributedAmount }) => contributedAmount)).toEqual([
      0.333333,
      0.333333
    ]);
    expect(item.requirementGroups[0].amount).toBe(0.666666);
    expect(roundGroceryQuantity(0.1 + 0.2)).toBe(0.3);
  });
});

describe("grocery-list requirement grouping", () => {
  it("sums compatible units while preserving every note and source", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [
        ingredient("ingredient-1", "Onion", 1, null, 0, "diced"),
        ingredient("ingredient-2", " onion ", 1, "", 1, "sliced")
      ])
    ]);

    expect(item.requirementGroups).toEqual([
      {
        amount: 2,
        contributionCount: 2,
        displayUnit: null,
        key: "",
        kind: "measured",
        sourceCount: 1
      }
    ]);
    expect(item.sources.map(({ original }) => original.notes)).toEqual([
      "diced",
      "sliced"
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "2 total"
    );
  });

  it("aliases cup and cups and pluralizes the summed display", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")]),
      recipe("recipe-2", [ingredient("ingredient-2", "rice", 2, "cups")])
    ]);

    expect(item.requirementGroups).toEqual([
      {
        amount: 3,
        contributionCount: 2,
        displayUnit: "cups",
        key: "cup",
        kind: "measured",
        sourceCount: 2
      }
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "3 cups total"
    );
  });

  it("keeps incompatible units inside one product row", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Pepper", 1, "tbsp")]),
      recipe("recipe-2", [ingredient("ingredient-2", "pepper", 2, "tsp")])
    ]);

    expect(item.normalizedName).toBe("pepper");
    expect(item.requirementGroups.map(({ amount, displayUnit }) => [amount, displayUnit])).toEqual([
      [1, "tbsp"],
      [2, "tsp"]
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "1 tbsp + 2 tsp"
    );
  });

  it("normalizes litre case while retaining the controlled display", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [
        ingredient("ingredient-1", "Stock", 1, "L"),
        ingredient("ingredient-2", "Stock", 0.5, "l", 1)
      ])
    ]);

    expect(item.requirementGroups[0]).toMatchObject({
      amount: 1.5,
      displayUnit: "L",
      key: "l"
    });
  });

  it("collapses all unquantified sources and omits their compact quantity", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Garlic", null, null)]),
      recipe("recipe-2", [ingredient("ingredient-2", " garlic ", null, "clove")])
    ]);

    expect(item.requirementGroups).toEqual([
      {
        amount: null,
        contributionCount: 2,
        displayUnit: null,
        key: "extra",
        kind: "extra",
        sourceCount: 2
      }
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBeNull();
  });

  it("puts one extra group after measured requirements", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Pepper", null, null)]),
      recipe("recipe-2", [ingredient("ingredient-2", "pepper", 1, "tbsp")]),
      recipe("recipe-3", [ingredient("ingredient-3", "PEPPER", null, null)])
    ]);

    expect(item.requirementGroups.map(({ kind, sourceCount }) => [kind, sourceCount])).toEqual([
      ["measured", 1],
      ["extra", 2]
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "1 tbsp + extra"
    );
  });

  it("shows two groups and a bounded overflow count", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Pepper", 6.5, "tbsp")]),
      recipe("recipe-2", [ingredient("ingredient-2", "pepper", 4, "tsp")]),
      recipe("recipe-3", [ingredient("ingredient-3", "pepper", 20, "g")]),
      recipe("recipe-4", [ingredient("ingredient-4", "pepper", 2, "pack")]),
      recipe("recipe-5", [ingredient("ingredient-5", "pepper", null, null)])
    ]);

    expect(item.requirementGroups).toHaveLength(5);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "6½ tbsp + 4 tsp + 3 more"
    );
  });

  it("combines ten different same-unit quantities into one group", () => {
    const recipes = Array.from({ length: 10 }, (_, index) =>
      recipe(
        `recipe-${index + 1}`,
        [ingredient(`ingredient-${index + 1}`, "Pepper", index + 1, "tsp")],
        { selectedRecipeOrder: index }
      )
    );
    const [item] = generateGroceryListItems(recipes);

    expect(item.requirementGroups).toEqual([
      {
        amount: 55,
        contributionCount: 10,
        displayUnit: "tsp",
        key: "tsp",
        kind: "measured",
        sourceCount: 10
      }
    ]);
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "55 tsp total"
    );
    expect(countGroceryListSourceRecipes(item.sources)).toBe(10);
  });

  it("keeps ten mixed-unit and null requirements in one compact product", () => {
    const requirements: [number | null, string | null][] = [
      [1, "tbsp"],
      [2, "tsp"],
      [3, "g"],
      [4, "pack"],
      [null, null],
      [2, "tbsp"],
      [3, "tsp"],
      [4, "g"],
      [5, "pack"],
      [null, "pcs"]
    ];
    const recipes = requirements.map(([amount, unit], index) =>
      recipe(
        `recipe-${index + 1}`,
        [ingredient(`ingredient-${index + 1}`, "Pepper", amount, unit)],
        { selectedRecipeOrder: index }
      )
    );
    const [item] = generateGroceryListItems(recipes);

    expect(item.sources).toHaveLength(10);
    expect(item.requirementGroups).toHaveLength(5);
    expect(item.requirementGroups.at(-1)).toMatchObject({
      contributionCount: 2,
      kind: "extra",
      sourceCount: 2
    });
    expect(formatCompactGroceryRequirements(item.requirementGroups)).toBe(
      "3 tbsp total + 5 tsp total + 3 more"
    );
  });
});

describe("grocery-list ordering and display", () => {
  it("uses the earliest recipe and ingredient positions deterministically", () => {
    const input = [
      recipe(
        "recipe-2",
        [
          ingredient("ingredient-z", "Salt", 1, "tsp", 1),
          ingredient("ingredient-b", "Pepper", 1, "tsp", 0)
        ],
        { selectedRecipeOrder: 1 }
      ),
      recipe(
        "recipe-1",
        [
          ingredient("ingredient-c", "Rice", 1, "cup", 2),
          ingredient("ingredient-a", "Pepper", 2, "tbsp", 1)
        ],
        { selectedRecipeOrder: 0 }
      )
    ];
    const items = generateGroceryListItems(input);

    expect(items.map(({ name, sortOrder }) => [name, sortOrder])).toEqual([
      ["Pepper", 0],
      ["Rice", 1],
      ["Salt", 2]
    ]);
    expect(items[0].sources.map(({ recipeIngredientId, sortOrder }) => [
      recipeIngredientId,
      sortOrder
    ])).toEqual([
      ["ingredient-a", 0],
      ["ingredient-b", 1]
    ]);
    expect(items[0].requirementGroups.map(({ displayUnit }) => displayUnit)).toEqual([
      "tbsp",
      "tsp"
    ]);
  });

  it("breaks equal item positions by normalized name before source ID", () => {
    const items = generateGroceryListItems([
      recipe("recipe-1", [
        ingredient("ingredient-a", "Beta", 1, null, 0),
        ingredient("ingredient-z", "Alpha", 1, null, 0)
      ])
    ]);

    expect(items.map(({ normalizedName }) => normalizedName)).toEqual([
      "alpha",
      "beta"
    ]);
  });

  it("formats common fractions and never emits floating tails", () => {
    expect(formatGroceryQuantity(6.5)).toBe("6½");
    expect(formatGroceryQuantity(1 / 3)).toBe("⅓");
    expect(formatGroceryQuantity(1.2)).toBe("1.2");
    expect(formatGroceryQuantity(0.1 + 0.2)).toBe("0.3");
    expect(formatGroceryQuantity(123456.123456)).toBe("123456.123456");
    expect(formatGroceryQuantity(1e21)).toBe("1000000000000000000000");
    expect(() => formatGroceryQuantity(Number.NaN)).toThrow(
      "Grocery quantities must be positive numbers."
    );
    expect(() => formatGroceryQuantity(0.0000001)).toThrow(
      "Grocery quantities must be positive numbers."
    );
    expect(() => formatGroceryQuantity(Number.MAX_VALUE)).toThrow(
      "Grocery quantities must be positive numbers."
    );
  });

  it("uses and resets a practical shopping override without changing requirements", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Tomatoes", 2, "can")]),
      recipe("recipe-2", [ingredient("ingredient-2", "tomatoes", 1, "can")])
    ]);
    const requirements = structuredClone(item.requirementGroups);

    expect(
      formatGroceryListQuantity({
        amount: 1,
        quantityOverridden: true,
        requirementGroups: item.requirementGroups,
        unit: "jar"
      })
    ).toBe("1 jar");
    expect(
      formatGroceryListQuantity({
        amount: null,
        quantityOverridden: false,
        requirementGroups: item.requirementGroups,
        unit: null
      })
    ).toBe("3 can total");
    expect(
      formatGroceryListQuantity({
        amount: Number.NaN,
        quantityOverridden: true,
        requirementGroups: item.requirementGroups,
        unit: "jar"
      })
    ).toBe("3 can total");
    expect(item.requirementGroups).toEqual(requirements);
  });

  it("pluralizes cup overrides but leaves grocery-specific units alone", () => {
    expect(
      formatGroceryListQuantity({
        amount: 2,
        quantityOverridden: true,
        requirementGroups: [],
        unit: "cup"
      })
    ).toBe("2 cups");
    expect(
      formatGroceryListQuantity({
        amount: 2,
        quantityOverridden: true,
        requirementGroups: [],
        unit: "bags"
      })
    ).toBe("2 bags");
  });

  it.each([0.0000001, Number.MAX_VALUE])(
    "defensively hides an override that cannot be represented at six decimals: %s",
    (amount) => {
      expect(
        formatGroceryListQuantity({
          amount,
          quantityOverridden: true,
          requirementGroups: [],
          unit: "bag"
        })
      ).toBeNull();
    }
  );

  it("does not mutate recipe, ingredient, or array inputs", () => {
    const original = [
      recipe(
        "recipe-1",
        [
          ingredient("ingredient-2", "Rice", 2, "cups", 1),
          ingredient("ingredient-1", "Pepper", 1, "tsp", 0)
        ],
        { selectedRecipeOrder: 0 }
      )
    ];
    const snapshot = structuredClone(original);

    generateGroceryListItems(original);

    expect(original).toEqual(snapshot);
  });
});

describe("grocery-list generation validation", () => {
  it("rejects missing and duplicate recipe selections", () => {
    expect(() => generateGroceryListItems([])).toThrow(
      "Choose at least one recipe."
    );

    const duplicate = [
      recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")]),
      recipe("recipe-1", [ingredient("ingredient-2", "Salt", 1, "tsp")], {
        selectedRecipeOrder: 1
      })
    ];
    expect(() => generateGroceryListItems(duplicate)).toThrow(
      "Choose each recipe only once."
    );
  });

  it("allows a meal-plan source with more than ten recipes", () => {
    const recipes = Array.from({ length: 11 }, (_, index) =>
      recipe(
        `recipe-${index + 1}`,
        [ingredient(`ingredient-${index + 1}`, `Item ${index + 1}`, 1, null)],
        { selectedRecipeOrder: index }
      )
    );

    expect(generateGroceryListItems(recipes)).toHaveLength(11);
  });

  it.each([0, 1.5])("rejects target servings of %s", (targetServings) => {
    expect(() =>
      generateGroceryListItems([
        recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")], {
          targetServings
        })
      ])
    ).toThrow("Target servings must be a positive whole number.");
  });

  it("allows summed meal-plan target servings above 100", () => {
    const [item] = generateGroceryListItems([
      recipe("recipe-1", [ingredient("ingredient-1", "Rice", 2, "cups")], {
        savedServings: 4,
        targetServings: 120
      })
    ]);

    expect(item.sources[0]).toMatchObject({
      contributedAmount: 60,
      scaleFactor: 30,
      targetServings: 120
    });
  });

  it.each([0, 101, 1.5])("rejects saved servings of %s", (savedServings) => {
    expect(() =>
      generateGroceryListItems([
        recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")], {
          savedServings
        })
      ])
    ).toThrow("Saved servings must be a whole number from 1 to 100.");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects ingredient amount %s",
    (amount) => {
      expect(() =>
        generateGroceryListItems([
          recipe("recipe-1", [ingredient("ingredient-1", "Rice", amount, "cup")])
        ])
      ).toThrow("Ingredient amounts must be positive numbers.");
    }
  );

  it("rejects duplicate source IDs and recipe positions", () => {
    expect(() =>
      generateGroceryListItems([
        recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")]),
        recipe("recipe-2", [ingredient("ingredient-1", "Salt", 1, "tsp")])
      ])
    ).toThrow("Every recipe ingredient must have a unique source.");

    expect(() =>
      generateGroceryListItems([
        recipe("recipe-1", [ingredient("ingredient-1", "Rice", 1, "cup")]),
        recipe("recipe-2", [ingredient("ingredient-2", "Salt", 1, "tsp")], {
          selectedRecipeOrder: 0
        })
      ])
    ).toThrow("Recipe order must use unique non-negative whole numbers.");
  });

  it("enforces the generated item limit after name grouping", () => {
    const ingredients = Array.from({ length: 301 }, (_, index) =>
      ingredient(`ingredient-${index}`, `Item ${index}`, 1, null, index)
    );

    expect(() => generateGroceryListItems([recipe("recipe-1", ingredients)])).toThrow(
      "A grocery list can contain at most 300 items."
    );
  });

  it("rejects an empty generated result and quantities that round to zero", () => {
    expect(() =>
      generateGroceryListItems([recipe("recipe-1", [])])
    ).toThrow("A generated grocery list must contain at least one item.");

    expect(() =>
      generateGroceryListItems([
        recipe("recipe-1", [
          ingredient("ingredient-1", "Saffron", 0.0000001, "g")
        ])
      ])
    ).toThrow("A scaled ingredient amount is outside the supported range.");
  });
});
