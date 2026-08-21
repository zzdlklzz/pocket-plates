import { formatGroceryRequirementGroup } from "./grocery-list.generation";
import {
  formatGroceryRequirementSourceCount,
  formatGrocerySourceAmount
} from "./grocery-list.requirement-formatting";
import type { GroceryListRequirementGroupDto } from "./grocery-list.types";

type GroceryRequirementDisplaySource = {
  contributedAmount: number | null;
  id?: string;
  original: {
    notes: string | null;
    unit: string | null;
  };
  recipeIngredientId?: string | null;
  recipeTitle: string;
};

type GroceryListRequirementDetailsProps = {
  capitalizeRequirements?: boolean;
  className?: string;
  requirementGroups: readonly GroceryListRequirementGroupDto[];
  sources: readonly GroceryRequirementDisplaySource[];
};

export function GroceryListRequirementDetails({
  capitalizeRequirements = false,
  className = "",
  requirementGroups,
  sources
}: GroceryListRequirementDetailsProps) {
  return (
    <details className={`${className} rounded-lg bg-leaf-50 px-3 py-2 text-sm`}>
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-leaf-800">
        Recipe requirements
      </summary>
      <div className="border-t border-leaf-100 pb-2 pt-3">
        <ul className="space-y-2 text-slate-700">
          {requirementGroups.map((group) => (
            <li
              className="flex justify-between gap-3"
              key={`${group.kind}-${group.key}`}
            >
              <span className={capitalizeRequirements ? "capitalize" : undefined}>
                {formatGroceryRequirementGroup(group)}
              </span>
              <span className="text-right text-xs text-slate-500">
                {formatGroceryRequirementSourceCount(group)}
              </span>
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2 border-t border-leaf-100 pt-3">
          {sources.map((source, index) => (
            <li
              className="flex justify-between gap-3 text-xs"
              key={
                source.id ??
                source.recipeIngredientId ??
                `${source.recipeTitle}-${index}`
              }
            >
              <span className="min-w-0 text-slate-700">
                {source.recipeTitle}
                {source.original.notes ? ` · ${source.original.notes}` : ""}
              </span>
              <span className="shrink-0 text-slate-500">
                {formatGrocerySourceAmount(source)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
