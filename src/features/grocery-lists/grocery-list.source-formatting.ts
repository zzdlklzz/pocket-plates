export function formatSelectedRecipeSource(sourceRecipeCount: number | undefined) {
  if (!Number.isInteger(sourceRecipeCount) || (sourceRecipeCount ?? 0) < 1) {
    return "Recipe snapshot";
  }

  return `${sourceRecipeCount} recipe${sourceRecipeCount === 1 ? "" : "s"}`;
}
