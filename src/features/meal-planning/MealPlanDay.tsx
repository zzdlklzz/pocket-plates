"use client";

import { ClipboardPaste, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { MEAL_TYPE_LABELS } from "./meal-planning.constants";
import { parseIsoDate } from "./meal-planning.dates";
import type { IsoDate, MealPlanEntryDto } from "./meal-planning.types";

type MealPlanDayProps = {
  canCopy: boolean;
  canPaste: boolean;
  date: IsoDate;
  entries: MealPlanEntryDto[];
  isRemoving: boolean;
  isToday: boolean;
  onAdd: (day: IsoDate, trigger: HTMLButtonElement) => void;
  onAddButtonChange: (button: HTMLButtonElement | null) => void;
  onCopy: () => void;
  onEdit: (entry: MealPlanEntryDto, trigger: HTMLButtonElement) => void;
  onPaste: (trigger: HTMLButtonElement) => void;
  onRemove: (entry: MealPlanEntryDto) => Promise<void>;
  onUndo: () => Promise<void>;
  removedMeal: { recipeTitle: string } | null;
  restoreError: unknown;
  restoring: boolean;
};

export function formatMealPlanDay(date: IsoDate) {
  const parsedDate = parseIsoDate(date)!;

  return {
    date: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short"
    }).format(parsedDate),
    dateLong: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "long"
    }).format(parsedDate),
    dayNumber: parsedDate.getDate(),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
      parsedDate
    ),
    weekdayShort: new Intl.DateTimeFormat(undefined, { weekday: "short" })
      .format(parsedDate)
      .toUpperCase()
  };
}

export function MealPlanDay({
  canCopy,
  canPaste,
  date,
  entries,
  isRemoving,
  isToday,
  onAdd,
  onAddButtonChange,
  onCopy,
  onEdit,
  onPaste,
  onRemove,
  onUndo,
  removedMeal,
  restoreError,
  restoring
}: MealPlanDayProps) {
  const day = formatMealPlanDay(date);

  return (
    <section
      aria-label={`${day.weekday} ${day.dateLong}`}
      className="py-5 first:pt-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900">{day.weekday}</h2>
          <p className="text-xs text-slate-500">
            {day.date}{isToday ? " · Today" : ""}
          </p>
        </div>
        {canCopy || canPaste ? (
          <div className="flex flex-wrap justify-end gap-1">
            {canCopy ? (
              <button
                aria-label={`Copy meals from ${day.weekday}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600"
                onClick={onCopy}
                type="button"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy day
              </button>
            ) : null}
            {canPaste ? (
              <button
                aria-label={`Paste copied day to ${day.weekday}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-leaf-700"
                onClick={(event) => onPaste(event.currentTarget)}
                type="button"
              >
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                Paste day
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              key={entry.id}
            >
              <button
                aria-label={`Edit ${entry.recipe.title} on ${day.weekday}`}
                className="min-w-0 flex-1 text-left"
                onClick={(event) => onEdit(entry, event.currentTarget)}
                type="button"
              >
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-leaf-700">
                  {MEAL_TYPE_LABELS[entry.mealType]}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {entry.recipe.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.servings} serving{entry.servings === 1 ? "" : "s"}
                  {entry.recipe.archived ? " · Archived recipe" : ""}
                </p>
              </button>
              {!entry.recipe.archived ? (
                <Link
                  aria-label={`View ${entry.recipe.title} recipe`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                  href={`/recipes/${entry.recipe.id}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
              <button
                aria-label={`Remove ${entry.recipe.title} from ${day.weekday}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 disabled:text-slate-400"
                disabled={isRemoving || restoring}
                onClick={() => onRemove(entry)}
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Nothing planned yet</p>
      )}

      {removedMeal ? (
        <InlineNotice
          aria-live="polite"
          className="mt-3 flex items-center justify-between gap-3"
          role="status"
          tone="neutral"
        >
          <span>{removedMeal.recipeTitle} removed</span>
          <button
            className="font-semibold text-leaf-700 disabled:text-slate-400"
            disabled={restoring}
            onClick={onUndo}
            type="button"
          >
            {restoring ? "Restoring..." : "Undo"}
          </button>
        </InlineNotice>
      ) : null}

      {removedMeal && restoreError ? (
        <InlineNotice className="mt-2" role="alert" tone="error">
          We could not restore that meal. Please try again.
        </InlineNotice>
      ) : null}

      <button
        aria-label={`Add meal to ${day.weekday}, ${day.dateLong}`}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-leaf-300 bg-leaf-50 px-4 py-2 text-sm font-semibold text-leaf-700"
        onClick={(event) => onAdd(date, event.currentTarget)}
        ref={onAddButtonChange}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add meal
      </button>
    </section>
  );
}
