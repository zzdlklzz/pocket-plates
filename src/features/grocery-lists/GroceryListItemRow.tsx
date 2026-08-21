"use client";

import { ChevronRight } from "lucide-react";
import {
  formatGroceryListQuantity,
  formatGroceryQuantity,
  formatGroceryRequirementGroup
} from "./grocery-list.generation";
import type {
  GroceryListItemDto,
  GroceryListItemSourceDto
} from "./grocery-list.types";

function countRecipes(sources: readonly GroceryListItemSourceDto[]) {
  return new Set(
    sources.map((source) => source.recipeId ?? `snapshot:${source.recipeTitle}`)
  ).size;
}

function formatSourceAmount(source: GroceryListItemSourceDto) {
  if (source.contributedAmount === null) {
    return "No quantity";
  }

  const amount = formatGroceryQuantity(source.contributedAmount);
  return source.original.unit ? `${amount} ${source.original.unit}` : amount;
}

type GroceryListItemRowProps = {
  isChecking: boolean;
  item: GroceryListItemDto;
  onCheck: (checked: boolean) => void;
  onEdit: (trigger: HTMLButtonElement) => void;
};

export function GroceryListItemRow({
  isChecking,
  item,
  onCheck,
  onEdit
}: GroceryListItemRowProps) {
  const quantity = formatGroceryListQuantity({
    ...item,
    quantityOverridden: item.isManual || item.quantityOverridden
  });
  const recipeCount = countRecipes(item.sources);

  return (
    <li className="border-b border-slate-200 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <label className="flex h-11 w-11 shrink-0 items-center justify-center">
          <span className="sr-only">
            {item.checked ? `Mark ${item.name} as not bought` : `Mark ${item.name} as bought`}
          </span>
          <input
            checked={item.checked}
            className="h-5 w-5 rounded border-slate-300 text-leaf-700 focus:ring-leaf-600"
            disabled={isChecking}
            onChange={(event) => onCheck(event.target.checked)}
            type="checkbox"
          />
        </label>

        <button
          aria-label={`Edit ${item.name}`}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-3 py-1 text-left"
          onClick={(event) => onEdit(event.currentTarget)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block font-semibold text-slate-900 ${item.checked ? "line-through text-slate-500" : ""}`}
            >
              {item.name}
            </span>
            {quantity ? (
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                {quantity}
              </span>
            ) : null}
            {item.notes ? (
              <span className="mt-1 block whitespace-pre-wrap text-xs leading-5 text-slate-500">
                {item.notes}
              </span>
            ) : null}
            {recipeCount > 0 ? (
              <span className="mt-1 block text-xs text-slate-500">
                {recipeCount === 1 ? "From 1 recipe" : `Used in ${recipeCount} recipes`}
              </span>
            ) : null}
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      {item.sources.length > 0 ? (
        <details className="ml-14 mt-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-leaf-800">
            Recipe requirements
          </summary>
          <div className="border-t border-leaf-100 pb-2 pt-3">
            <ul className="space-y-2 text-slate-700">
              {item.requirementGroups.map((group) => (
                <li className="flex justify-between gap-3" key={`${group.kind}-${group.key}`}>
                  <span>{formatGroceryRequirementGroup(group)}</span>
                  <span className="text-right text-xs text-slate-500">
                    {group.sourceCount} recipe{group.sourceCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-2 border-t border-leaf-100 pt-3">
              {item.sources.map((source) => (
                <li className="flex justify-between gap-3 text-xs" key={source.id}>
                  <span className="min-w-0 text-slate-700">
                    {source.recipeTitle}
                    {source.original.notes ? ` · ${source.original.notes}` : ""}
                  </span>
                  <span className="shrink-0 text-slate-500">{formatSourceAmount(source)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </li>
  );
}
