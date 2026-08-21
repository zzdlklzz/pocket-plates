"use client";

import { ChevronRight } from "lucide-react";
import {
  formatGroceryListQuantity
} from "./grocery-list.generation";
import { formatGrocerySourceSummary } from "./grocery-list.requirement-formatting";
import type { GroceryListItemDto } from "./grocery-list.types";
import { GroceryListRequirementDetails } from "./GroceryListRequirementDetails";

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
  const sourceSummary = formatGrocerySourceSummary(item.sources);

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
            {sourceSummary ? (
              <span className="mt-1 block text-xs text-slate-500">
                {sourceSummary}
              </span>
            ) : null}
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      {item.sources.length > 0 ? (
        <GroceryListRequirementDetails
          className="ml-14 mt-2"
          requirementGroups={item.requirementGroups}
          sources={item.sources}
        />
      ) : null}
    </li>
  );
}
