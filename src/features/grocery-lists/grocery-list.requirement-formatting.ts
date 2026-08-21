import type { GroceryListRequirementGroupDto } from "./grocery-list.types";
import { formatGroceryQuantity } from "./grocery-list.generation";

type GrocerySourceAmount = {
  contributedAmount: number | null;
  original: { unit: string | null };
};

type GrocerySourceIdentity = {
  recipeId: string | null;
  recipeTitle: string;
};

export function formatGroceryRequirementSourceCount(
  group: Pick<GroceryListRequirementGroupDto, "kind" | "sourceCount">
) {
  const recipes = `${group.sourceCount} recipe${group.sourceCount === 1 ? "" : "s"}`;
  return group.kind === "extra" ? `${recipes} gave no quantity` : recipes;
}

export function formatGrocerySourceAmount(source: GrocerySourceAmount) {
  if (source.contributedAmount === null) {
    return "No quantity";
  }

  const amount = formatGroceryQuantity(source.contributedAmount);
  return source.original.unit ? `${amount} ${source.original.unit}` : amount;
}

export function formatGrocerySourceSummary(
  sources: readonly GrocerySourceIdentity[]
) {
  const recipeCount = new Set(
    sources.map(({ recipeId, recipeTitle }) =>
      recipeId ?? `snapshot:${recipeTitle}`
    )
  ).size;

  if (recipeCount === 0) {
    return null;
  }

  return recipeCount === 1
    ? `From ${sources[0]?.recipeTitle}`
    : `Used in ${recipeCount} recipes`;
}
