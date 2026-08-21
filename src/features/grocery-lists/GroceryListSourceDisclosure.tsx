import {
  formatCompactGroceryRequirements
} from "./grocery-list.generation";
import type { GeneratedGroceryListItem } from "./grocery-list.types";
import { formatGrocerySourceSummary } from "./grocery-list.requirement-formatting";
import { GroceryListRequirementDetails } from "./GroceryListRequirementDetails";

export function GroceryListSourceDisclosure({
  item
}: {
  item: GeneratedGroceryListItem;
}) {
  const quantity = formatCompactGroceryRequirements(item.requirementGroups);
  const sourceSummary = formatGrocerySourceSummary(item.sources);

  return (
    <li className="border-b border-slate-200 py-3 last:border-b-0">
      <p className="font-semibold text-slate-900">{item.name}</p>
      {quantity ? (
        <p className="mt-1 text-sm leading-5 text-slate-600">{quantity}</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">
        {sourceSummary}
      </p>

      <GroceryListRequirementDetails
        capitalizeRequirements
        className="mt-2"
        requirementGroups={item.requirementGroups}
        sources={item.sources}
      />
    </li>
  );
}
