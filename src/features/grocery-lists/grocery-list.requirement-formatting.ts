import type { GroceryListRequirementGroupDto } from "./grocery-list.types";

export function formatGroceryRequirementSourceCount(
  group: Pick<GroceryListRequirementGroupDto, "kind" | "sourceCount">
) {
  const recipes = `${group.sourceCount} recipe${group.sourceCount === 1 ? "" : "s"}`;
  return group.kind === "extra" ? `${recipes} gave no quantity` : recipes;
}
