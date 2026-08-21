import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { GroceryListSummaryDto } from "./grocery-list.types";
import { formatSelectedRecipeSource } from "./grocery-list.source-formatting";
import { formatGroceryListWeekRange } from "./grocery-list.week-formatting";

function formatWeekLabel(weekStartDate: string | null, mealPlanAvailable: boolean) {
  const weekRange = formatGroceryListWeekRange(weekStartDate);
  if (!weekRange) {
    return "Week unavailable";
  }

  const source = mealPlanAvailable ? "Meal plan" : "Week unavailable";
  return `${source} · ${weekRange}`;
}

function formatSourceLabel(list: GroceryListSummaryDto) {
  if (list.sourceType === "meal_plan") {
    return formatWeekLabel(list.sourceWeekStartDate, list.mealPlanAvailable);
  }

  if (list.sourceType === "recipes") {
    return formatSelectedRecipeSource(list.sourceRecipeCount);
  }

  return "Manual";
}

function formatActivity(updatedAt: string) {
  const updated = new Date(updatedAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfUpdated = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate()
  );
  const dayDifference = Math.round(
    (startOfToday.getTime() - startOfUpdated.getTime()) / 86_400_000
  );

  if (dayDifference === 0) {
    return "Updated today";
  }
  if (dayDifference === 1) {
    return "Updated yesterday";
  }

  return `Updated ${new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(updated)}`;
}

export function GroceryListCard({ list }: { list: GroceryListSummaryDto }) {
  const progress = list.itemCount === 0
    ? 0
    : Math.round((list.checkedItemCount / list.itemCount) * 100);

  return (
    <li>
      <Link
        aria-label={`Open ${list.title}, ${list.checkedItemCount} of ${list.itemCount} checked`}
        className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        href={`/grocery-lists/${list.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{list.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{formatSourceLabel(list)}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </div>
        <div
          aria-label={`${progress}% complete`}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-leaf-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {list.checkedItemCount} of {list.itemCount} checked · {formatActivity(list.updatedAt)}
        </p>
      </Link>
    </li>
  );
}
