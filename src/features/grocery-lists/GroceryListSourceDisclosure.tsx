import {
  countGroceryListSourceRecipes,
  formatCompactGroceryRequirements,
  formatGroceryQuantity,
  formatGroceryRequirementGroup
} from "./grocery-list.generation";
import type { GeneratedGroceryListItem } from "./grocery-list.types";
import { formatGroceryRequirementSourceCount } from "./grocery-list.requirement-formatting";

function formatSourceAmount(
  source: GeneratedGroceryListItem["sources"][number]
) {
  if (source.contributedAmount === null) {
    return "No quantity";
  }

  const amount = formatGroceryQuantity(source.contributedAmount);
  return source.original.unit ? `${amount} ${source.original.unit}` : amount;
}

export function GroceryListSourceDisclosure({
  item
}: {
  item: GeneratedGroceryListItem;
}) {
  const quantity = formatCompactGroceryRequirements(item.requirementGroups);
  const recipeCount = countGroceryListSourceRecipes(item.sources);

  return (
    <li className="border-b border-slate-200 py-3 last:border-b-0">
      <p className="font-semibold text-slate-900">{item.name}</p>
      {quantity ? (
        <p className="mt-1 text-sm leading-5 text-slate-600">{quantity}</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">
        {recipeCount === 1
          ? `From ${item.sources[0]?.recipeTitle}`
          : `Used in ${recipeCount} recipes`}
      </p>

      <details className="mt-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold text-leaf-800">
          Recipe requirements
        </summary>
        <div className="border-t border-leaf-100 pb-2 pt-3">
          <ul className="space-y-2 text-slate-700">
            {item.requirementGroups.map((group) => (
              <li
                className="flex justify-between gap-3"
                key={`${group.kind}-${group.key}`}
              >
                <span className="capitalize">
                  {formatGroceryRequirementGroup(group)}
                </span>
                <span className="text-right text-xs text-slate-500">
                  {formatGroceryRequirementSourceCount(group)}
                </span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2 border-t border-leaf-100 pt-3">
            {item.sources.map((source) => (
              <li
                className="flex justify-between gap-3 text-xs"
                key={source.recipeIngredientId}
              >
                <span className="min-w-0 text-slate-700">
                  {source.recipeTitle}
                  {source.original.notes ? ` · ${source.original.notes}` : ""}
                </span>
                <span className="shrink-0 text-slate-500">
                  {formatSourceAmount(source)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  );
}
