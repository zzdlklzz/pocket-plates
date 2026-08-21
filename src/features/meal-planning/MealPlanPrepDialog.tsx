"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRef, type RefObject } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { useDialogFocusManagement } from "@/components/ui/useDialogFocusManagement";
import { parseIsoDate } from "./meal-planning.dates";
import {
  formatMealPlanPrepScale,
  type MealPlanPrepRow,
  type MealPlanPrepSummary
} from "./meal-planning.prep";

type MealPlanPrepDialogProps = {
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  summary: MealPlanPrepSummary;
};

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function formatPlannedDays(row: MealPlanPrepRow) {
  const days = row.plannedDates
    .map((date) =>
      new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
        parseIsoDate(date) ?? undefined
      )
    )
    .join(" · ");

  return row.appearanceCount > row.plannedDates.length
    ? `${days} · ${pluralize(row.appearanceCount, "appearance")}`
    : days;
}

export function MealPlanPrepDialog({
  onClose,
  returnFocusRef,
  summary
}: MealPlanPrepDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useDialogFocusManagement({
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
    returnFocusRef
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label="Weekly prep summary"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        ref={dialogRef}
        role="dialog"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
          <h2 className="text-lg font-bold text-slate-900">Weekly prep summary</h2>
          <button
            aria-label="Close prep summary"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 min-h-0 overflow-y-auto">
          <p className="text-sm text-slate-600">
            {pluralize(summary.rows.length, "recipe")} · {pluralize(summary.totalPlannedServings, "planned serving")}
          </p>

          <ul className="mt-4 space-y-3">
            {summary.rows.map((row) => (
              <li
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                key={row.recipeId}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {row.archived ? (
                        row.title
                      ) : (
                        <Link
                          aria-label={`View ${row.title} recipe`}
                          className="inline-flex min-h-11 items-center text-leaf-800 underline decoration-leaf-300 underline-offset-2"
                          href={`/recipes/${row.recipeId}`}
                        >
                          {row.title}
                        </Link>
                      )}
                    </h3>
                    {row.archived ? (
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Archived recipe
                      </p>
                    ) : null}
                  </div>
                  <p className="max-w-[55%] text-right text-xs leading-5 text-slate-500">
                    {formatPlannedDays(row)}
                  </p>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Need {pluralize(row.totalPlannedServings, "serving")}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Saved recipe makes {pluralize(row.savedRecipeYield, "serving")}
                  </span>
                  <span className="rounded-lg bg-leaf-100 px-2.5 py-1.5 font-semibold text-leaf-800">
                    Scale {formatMealPlanPrepScale(
                      row.totalPlannedServings,
                      row.savedRecipeYield
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600">
            Totals use planned portions without batch rounding or plan changes.
          </p>
          <ActionButton className="mt-4" fullWidth onClick={onClose} variant="secondary">
            Close
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
