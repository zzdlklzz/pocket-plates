import type { IsoDate, MealPlanWeekDates } from "./meal-planning.types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;
  const day = Number(dayValue);

  if (year === 0) {
    return null;
  }

  const date = new Date(0);

  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatIsoDate(date: Date): IsoDate {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot format an invalid date.");
  }

  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDate;
}

export function getWeekStart(date: Date): IsoDate {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot find the week for an invalid date.");
  }

  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;

  monday.setDate(monday.getDate() - daysSinceMonday);

  return formatIsoDate(monday);
}

export function normalizeWeekStart(
  value: string | null | undefined,
  fallbackDate: Date
): IsoDate {
  const requestedDate = value ? parseIsoDate(value) : null;

  return getWeekStart(requestedDate ?? fallbackDate);
}

export function addCalendarDays(date: IsoDate, dayCount: number): IsoDate {
  const parsedDate = parseIsoDate(date);

  if (!parsedDate) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  parsedDate.setDate(parsedDate.getDate() + dayCount);

  return formatIsoDate(parsedDate);
}

export function getWeekDates(weekStart: IsoDate): MealPlanWeekDates {
  const parsedWeekStart = parseIsoDate(weekStart);

  if (!parsedWeekStart) {
    throw new Error(`Invalid ISO date: ${weekStart}`);
  }

  const monday = getWeekStart(parsedWeekStart);

  return [
    monday,
    addCalendarDays(monday, 1),
    addCalendarDays(monday, 2),
    addCalendarDays(monday, 3),
    addCalendarDays(monday, 4),
    addCalendarDays(monday, 5),
    addCalendarDays(monday, 6)
  ];
}

export function isDateInWeek(date: string, weekStart: IsoDate): boolean {
  if (!parseIsoDate(date)) {
    return false;
  }

  return getWeekDates(weekStart).includes(date as IsoDate);
}

export function getPreviousWeekStart(weekStart: IsoDate): IsoDate {
  return addCalendarDays(getWeekDates(weekStart)[0], -7);
}

export function getNextWeekStart(weekStart: IsoDate): IsoDate {
  return addCalendarDays(getWeekDates(weekStart)[0], 7);
}
