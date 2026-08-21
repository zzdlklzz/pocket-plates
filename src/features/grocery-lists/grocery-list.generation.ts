import { MAX_SERVINGS } from "@/features/recipes/recipe.constants";
import {
  GROCERY_LIST_QUANTITY_DECIMAL_PLACES,
  MAX_COMPACT_REQUIREMENT_GROUPS,
  MAX_GROCERY_LIST_ITEMS,
  MIN_GROCERY_LIST_TARGET_SERVINGS
} from "./grocery-list.constants";
import type {
  GeneratedGroceryListItem,
  GeneratedGroceryListItemSource,
  GroceryListGenerationRecipeInput,
  GroceryListItemSourceDto,
  GroceryListQuantityDisplayInput,
  GroceryListRequirementGroupDto
} from "./grocery-list.types";

const QUANTITY_MULTIPLIER = 10 ** GROCERY_LIST_QUANTITY_DECIMAL_PLACES;
const FRACTION_TOLERANCE = 1 / QUANTITY_MULTIPLIER;
const EXTRA_REQUIREMENT_KEY = "extra";

const DISPLAY_FRACTIONS = [
  [1 / 8, "⅛"],
  [1 / 6, "⅙"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [5 / 6, "⅚"],
  [7 / 8, "⅞"]
] as const;

type UnitIdentity = {
  key: string;
  displayUnit: string | null;
};

type RequirementAccumulator = {
  amount: number;
  contributionCount: number;
  displayUnit: string | null;
  firstSource: GroceryRequirementSource;
  recipeIds: Set<string>;
};

type GroceryRequirementSource = Pick<
  GroceryListItemSourceDto,
  | "canonicalUnit"
  | "contributedAmount"
  | "original"
  | "recipeId"
  | "recipeIngredientId"
  | "recipeTitle"
  | "sortOrder"
>;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSources(
  left: GeneratedGroceryListItemSource,
  right: GeneratedGroceryListItemSource
) {
  return (
    compareSourcePositions(left, right) ||
    compareText(left.recipeIngredientId, right.recipeIngredientId)
  );
}

function compareSourcePositions(
  left: GeneratedGroceryListItemSource,
  right: GeneratedGroceryListItemSource
) {
  return (
    left.selectedRecipeOrder - right.selectedRecipeOrder ||
    left.ingredientSortOrder - right.ingredientSortOrder
  );
}

function assertWholeNumberInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a whole number from ${minimum} to ${maximum}.`);
  }
}

function assertPositiveWholeNumber(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive whole number.`);
  }
}

function normalizeUnit(unit: string | null): UnitIdentity {
  const trimmed = unit?.trim() ?? "";
  if (!trimmed) {
    return { displayUnit: null, key: "" };
  }

  const key = trimmed.toLowerCase();
  if (key === "cup" || key === "cups") {
    return { displayUnit: "cup", key: "cup" };
  }

  if (key === "l") {
    return { displayUnit: "L", key: "l" };
  }

  return { displayUnit: trimmed, key };
}

function displayUnitForAmount(
  canonicalUnit: string,
  firstDisplayUnit: string | null,
  amount: number
) {
  if (canonicalUnit === "cup") {
    return amount === 1 ? "cup" : "cups";
  }

  return firstDisplayUnit;
}

function compareRequirementSources(
  left: GroceryRequirementSource,
  right: GroceryRequirementSource
) {
  return (
    left.sortOrder - right.sortOrder ||
    compareText(left.recipeIngredientId ?? left.recipeTitle, right.recipeIngredientId ?? right.recipeTitle)
  );
}

function getSourceRecipeIdentity(source: GroceryRequirementSource) {
  return source.recipeId ?? `snapshot:${source.recipeTitle}`;
}

export function buildGroceryRequirementGroups(
  sources: readonly GroceryRequirementSource[]
): GroceryListRequirementGroupDto[] {
  const measuredByUnit = new Map<string, RequirementAccumulator>();
  const extraSources = sources.filter(({ contributedAmount }) => contributedAmount === null);

  for (const source of sources) {
    if (source.contributedAmount === null) {
      continue;
    }

    const key = source.canonicalUnit ?? "";
    const existing = measuredByUnit.get(key);

    if (existing) {
      existing.amount = roundGroceryQuantity(
        existing.amount + source.contributedAmount
      );
      existing.contributionCount += 1;
      existing.recipeIds.add(getSourceRecipeIdentity(source));
      continue;
    }

    measuredByUnit.set(key, {
      amount: source.contributedAmount,
      contributionCount: 1,
      displayUnit: normalizeUnit(source.original.unit).displayUnit,
      firstSource: source,
      recipeIds: new Set([getSourceRecipeIdentity(source)])
    });
  }

  const groups: GroceryListRequirementGroupDto[] = Array.from(
    measuredByUnit,
    ([key, accumulator]) => ({
      amount: accumulator.amount,
      contributionCount: accumulator.contributionCount,
      displayUnit: displayUnitForAmount(
        key,
        accumulator.displayUnit,
        accumulator.amount
      ),
      firstSource: accumulator.firstSource,
      key,
      kind: "measured" as const,
      sourceCount: accumulator.recipeIds.size
    })
  )
    .sort(
      (left, right) =>
        compareRequirementSources(left.firstSource, right.firstSource) ||
        compareText(left.key, right.key) ||
        compareText(
          left.firstSource.recipeIngredientId ?? left.firstSource.recipeTitle,
          right.firstSource.recipeIngredientId ?? right.firstSource.recipeTitle
        )
    )
    .map((group) => ({
      amount: group.amount,
      contributionCount: group.contributionCount,
      displayUnit: group.displayUnit,
      key: group.key,
      kind: group.kind,
      sourceCount: group.sourceCount
    }));

  if (extraSources.length > 0) {
    groups.push({
      amount: null,
      contributionCount: extraSources.length,
      displayUnit: null,
      key: EXTRA_REQUIREMENT_KEY,
      kind: "extra",
      sourceCount: new Set(extraSources.map(getSourceRecipeIdentity)).size
    });
  }

  return groups;
}

export function normalizeGroceryListItemName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function roundGroceryQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * QUANTITY_MULTIPLIER) /
    QUANTITY_MULTIPLIER;
}

export function isRepresentableGroceryQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return false;
  }

  const rounded = roundGroceryQuantity(value);
  return Number.isFinite(rounded) && rounded > 0;
}

export function formatGroceryQuantity(value: number) {
  if (!isRepresentableGroceryQuantity(value)) {
    throw new Error("Grocery quantities must be positive numbers.");
  }

  const rounded = roundGroceryQuantity(value);
  const whole = Math.floor(rounded);
  const fraction = rounded - whole;
  const displayFraction = DISPLAY_FRACTIONS.find(
    ([candidate]) => Math.abs(candidate - fraction) <= FRACTION_TOLERANCE
  )?.[1];

  if (displayFraction) {
    return `${whole || ""}${displayFraction}`;
  }

  return rounded.toLocaleString("en-US", {
    maximumFractionDigits: GROCERY_LIST_QUANTITY_DECIMAL_PLACES,
    notation: "standard",
    useGrouping: false
  });
}

export function formatGroceryRequirementGroup(
  group: GroceryListRequirementGroupDto
) {
  if (group.kind === "extra" || group.amount === null) {
    return "extra";
  }

  const quantity = formatGroceryQuantity(group.amount);
  const amountAndUnit = group.displayUnit
    ? `${quantity} ${group.displayUnit}`
    : quantity;

  return group.contributionCount > 1
    ? `${amountAndUnit} total`
    : amountAndUnit;
}

export function formatCompactGroceryRequirements(
  groups: readonly GroceryListRequirementGroupDto[]
) {
  if (!groups.some(({ kind }) => kind === "measured")) {
    return null;
  }

  const visibleGroups = groups.slice(0, MAX_COMPACT_REQUIREMENT_GROUPS);
  const parts = visibleGroups.map(formatGroceryRequirementGroup);
  const hiddenGroupCount = groups.length - visibleGroups.length;

  if (hiddenGroupCount > 0) {
    parts.push(`${hiddenGroupCount} more`);
  }

  return parts.join(" + ");
}

export function formatGroceryListQuantity({
  amount,
  quantityOverridden,
  requirementGroups,
  unit
}: GroceryListQuantityDisplayInput) {
  if (
    quantityOverridden &&
    amount !== null &&
    isRepresentableGroceryQuantity(amount)
  ) {
    const unitIdentity = normalizeUnit(unit);
    const displayUnit = displayUnitForAmount(
      unitIdentity.key,
      unitIdentity.displayUnit,
      amount
    );
    const quantity = formatGroceryQuantity(amount);

    return displayUnit ? `${quantity} ${displayUnit}` : quantity;
  }

  return formatCompactGroceryRequirements(requirementGroups);
}

export function countGroceryListSourceRecipes(
  sources: readonly Pick<GeneratedGroceryListItemSource, "recipeId">[]
) {
  return new Set(sources.map(({ recipeId }) => recipeId)).size;
}

export function generateGroceryListItems(
  recipes: readonly GroceryListGenerationRecipeInput[]
): GeneratedGroceryListItem[] {
  if (recipes.length < 1) {
    throw new Error("Choose at least one recipe.");
  }

  const recipeIds = new Set<string>();
  const recipeOrders = new Set<number>();
  const ingredientIds = new Set<string>();
  const sourcesByName = new Map<string, GeneratedGroceryListItemSource[]>();

  for (const recipe of recipes) {
    if (!recipe.recipeId || recipeIds.has(recipe.recipeId)) {
      throw new Error("Choose each recipe only once.");
    }
    recipeIds.add(recipe.recipeId);

    if (
      !Number.isInteger(recipe.selectedRecipeOrder) ||
      recipe.selectedRecipeOrder < 0 ||
      recipeOrders.has(recipe.selectedRecipeOrder)
    ) {
      throw new Error("Recipe order must use unique non-negative whole numbers.");
    }
    recipeOrders.add(recipe.selectedRecipeOrder);

    if (!recipe.recipeTitle.trim()) {
      throw new Error("Every selected recipe must have a title.");
    }

    assertWholeNumberInRange(
      recipe.savedServings,
      MIN_GROCERY_LIST_TARGET_SERVINGS,
      MAX_SERVINGS,
      "Saved servings"
    );
    assertPositiveWholeNumber(recipe.targetServings, "Target servings");

    const rawScaleFactor = recipe.targetServings / recipe.savedServings;
    const scaleFactor = roundGroceryQuantity(rawScaleFactor);

    for (const ingredient of recipe.ingredients) {
      const normalizedName = normalizeGroceryListItemName(ingredient.name);
      if (!normalizedName) {
        throw new Error("Every generated item must have a name.");
      }

      if (!ingredient.id || ingredientIds.has(ingredient.id)) {
        throw new Error("Every recipe ingredient must have a unique source.");
      }
      ingredientIds.add(ingredient.id);

      if (!Number.isInteger(ingredient.sortOrder) || ingredient.sortOrder < 0) {
        throw new Error("Ingredient order must be a non-negative whole number.");
      }

      if (
        ingredient.amount !== null &&
        (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0)
      ) {
        throw new Error("Ingredient amounts must be positive numbers.");
      }

      const contributedAmount =
        ingredient.amount === null
          ? null
          : roundGroceryQuantity(ingredient.amount * rawScaleFactor);

      if (
        contributedAmount !== null &&
        !isRepresentableGroceryQuantity(contributedAmount)
      ) {
        throw new Error("A scaled ingredient amount is outside the supported range.");
      }

      const unitIdentity = normalizeUnit(ingredient.unit);
      const source: GeneratedGroceryListItemSource = {
        canonicalUnit:
          contributedAmount === null ? null : unitIdentity.key,
        contributedAmount,
        ingredientSortOrder: ingredient.sortOrder,
        original: {
          amount: ingredient.amount,
          name: ingredient.name,
          notes: ingredient.notes,
          unit: ingredient.unit
        },
        recipeId: recipe.recipeId,
        recipeIngredientId: ingredient.id,
        recipeTitle: recipe.recipeTitle,
        savedServings: recipe.savedServings,
        scaleFactor,
        selectedRecipeOrder: recipe.selectedRecipeOrder,
        sortOrder: 0,
        targetServings: recipe.targetServings
      };
      const currentSources = sourcesByName.get(normalizedName) ?? [];
      currentSources.push(source);
      sourcesByName.set(normalizedName, currentSources);
    }
  }

  if (sourcesByName.size < 1) {
    throw new Error("A generated grocery list must contain at least one item.");
  }

  if (sourcesByName.size > MAX_GROCERY_LIST_ITEMS) {
    throw new Error(
      `A grocery list can contain at most ${MAX_GROCERY_LIST_ITEMS} items.`
    );
  }

  return Array.from(sourcesByName, ([normalizedName, unsortedSources]) => {
    const sources = [...unsortedSources]
      .sort(compareSources)
      .map((source, sortOrder) => ({ ...source, sortOrder }));

    return {
      name: sources[0]!.original.name.trim().replace(/\s+/g, " "),
      normalizedName,
      requirementGroups: buildGroceryRequirementGroups(sources),
      sortOrder: 0,
      sources
    };
  })
    .sort((left, right) => {
      const sourceComparison = compareSourcePositions(
        left.sources[0]!,
        right.sources[0]!
      );

      return (
        sourceComparison ||
        compareText(left.normalizedName, right.normalizedName) ||
        compareText(
          left.sources[0]!.recipeIngredientId,
          right.sources[0]!.recipeIngredientId
        )
      );
    })
    .map((item, sortOrder) => ({ ...item, sortOrder }));
}
