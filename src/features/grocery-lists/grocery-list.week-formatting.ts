import {
  addCalendarDays,
  parseIsoDate
} from "@/features/meal-planning/meal-planning.dates";
import type { IsoDate } from "@/features/meal-planning/meal-planning.types";

export function formatGroceryListWeekRange(weekStartDate: string | null) {
  if (!weekStartDate) {
    return null;
  }

  const start = parseIsoDate(weekStartDate);
  if (!start) {
    return null;
  }

  const end = parseIsoDate(addCalendarDays(weekStartDate as IsoDate, 6))!;
  const monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short"
  });

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.getDate()}–${end.getDate()} ${monthFormatter.format(end)}`;
  }

  return `${start.getDate()} ${monthFormatter.format(start)}–${end.getDate()} ${monthFormatter.format(end)}`;
}
