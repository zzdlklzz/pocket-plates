import type {
  IsoDate,
  MealPlanEntryDto
} from "./meal-planning.types";

export type MealPlanPrepRow = {
  appearanceCount: number;
  archived: boolean;
  plannedDates: IsoDate[];
  recipeId: string;
  savedRecipeYield: number;
  title: string;
  totalPlannedServings: number;
};

export type MealPlanPrepSummary = {
  rows: MealPlanPrepRow[];
  totalPlannedServings: number;
};

type PendingPrepRow = Omit<MealPlanPrepRow, "plannedDates"> & {
  plannedDates: Set<IsoDate>;
};

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function greatestCommonDivisor(left: number, right: number) {
  let remainder = right;
  let divisor = left;

  while (remainder !== 0) {
    [divisor, remainder] = [remainder, divisor % remainder];
  }

  return divisor;
}

export function buildMealPlanPrepSummary(
  entries: readonly MealPlanEntryDto[]
): MealPlanPrepSummary {
  const rowsByRecipeId = new Map<string, PendingPrepRow>();
  let totalPlannedServings = 0;

  for (const entry of entries) {
    totalPlannedServings += entry.servings;
    const existing = rowsByRecipeId.get(entry.recipe.id);

    if (existing) {
      existing.appearanceCount += 1;
      existing.plannedDates.add(entry.plannedFor);
      existing.totalPlannedServings += entry.servings;
      continue;
    }

    rowsByRecipeId.set(entry.recipe.id, {
      appearanceCount: 1,
      archived: entry.recipe.archived,
      plannedDates: new Set([entry.plannedFor]),
      recipeId: entry.recipe.id,
      savedRecipeYield: entry.recipe.servings,
      title: entry.recipe.title,
      totalPlannedServings: entry.servings
    });
  }

  const rows = Array.from(rowsByRecipeId.values(), (row) => {
    const plannedDates = Array.from(row.plannedDates).sort();

    return {
      ...row,
      plannedDates
    };
  }).sort((left, right) => {
    const dateComparison = compareText(
      left.plannedDates[0]!,
      right.plannedDates[0]!
    );
    const titleComparison = compareText(left.title, right.title);

    return (
      dateComparison ||
      titleComparison ||
      compareText(left.recipeId, right.recipeId)
    );
  });

  return { rows, totalPlannedServings };
}

export function formatMealPlanPrepScale(
  totalPlannedServings: number,
  savedRecipeYield: number
) {
  const divisor = greatestCommonDivisor(
    totalPlannedServings,
    savedRecipeYield
  );
  const numerator = totalPlannedServings / divisor;
  const denominator = savedRecipeYield / divisor;

  if (denominator === 1) {
    return `${numerator}×`;
  }

  let terminatingDenominator = denominator;
  let decimalPlaces = 0;

  while (terminatingDenominator % 2 === 0) {
    terminatingDenominator /= 2;
    decimalPlaces += 1;
  }

  let factorsOfFive = 0;
  while (terminatingDenominator % 5 === 0) {
    terminatingDenominator /= 5;
    factorsOfFive += 1;
  }

  if (terminatingDenominator !== 1) {
    return `${numerator}/${denominator}×`;
  }

  return `${(numerator / denominator).toFixed(
    Math.max(decimalPlaces, factorsOfFive)
  )}×`;
}
