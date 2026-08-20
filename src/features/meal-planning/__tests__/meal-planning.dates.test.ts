import { describe, expect, it } from "vitest";
import {
  formatIsoDate,
  getNextWeekStart,
  getPreviousWeekStart,
  getWeekDates,
  getWeekStart,
  isDateInWeek,
  normalizeWeekStart,
  parseIsoDate
} from "../meal-planning.dates";

describe("meal-planning dates", () => {
  it("normalizes every weekday to the same Monday", () => {
    const dates = [17, 18, 19, 20, 21, 22, 23].map(
      (day) => new Date(2026, 7, day, 12)
    );

    expect(dates.map(getWeekStart)).toEqual(Array(7).fill("2026-08-17"));
  });

  it("normalizes valid query dates and falls back from invalid values", () => {
    const fallbackDate = new Date(2026, 7, 20, 12);

    expect(normalizeWeekStart("2026-08-23", fallbackDate)).toBe("2026-08-17");
    expect(normalizeWeekStart(null, fallbackDate)).toBe("2026-08-17");
    expect(normalizeWeekStart(undefined, fallbackDate)).toBe("2026-08-17");
    expect(normalizeWeekStart("not-a-date", fallbackDate)).toBe("2026-08-17");
    expect(normalizeWeekStart("0000-01-03", fallbackDate)).toBe("2026-08-17");
    expect(normalizeWeekStart("2027-01-03", fallbackDate)).toBe("2026-12-28");
  });

  it("formats and parses ISO dates using local calendar parts", () => {
    const localDate = new Date(2026, 1, 28, 0, 30);
    const parsedDate = parseIsoDate("2026-02-28");

    expect(formatIsoDate(localDate)).toBe("2026-02-28");
    expect(parsedDate?.getFullYear()).toBe(2026);
    expect(parsedDate?.getMonth()).toBe(1);
    expect(parsedDate?.getDate()).toBe(28);
    expect(parsedDate?.getHours()).toBe(0);
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("0000-01-01")).toBeNull();
  });

  it("returns exactly seven dates and validates week membership", () => {
    const weekStart = "2026-08-31";

    expect(getWeekDates(weekStart)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06"
    ]);
    expect(isDateInWeek("2026-08-31", weekStart)).toBe(true);
    expect(isDateInWeek("2026-09-06", weekStart)).toBe(true);
    expect(isDateInWeek("2026-09-07", weekStart)).toBe(false);
    expect(isDateInWeek("invalid", weekStart)).toBe(false);
  });

  it("moves between weeks across month and year boundaries", () => {
    expect(getPreviousWeekStart("2026-03-02")).toBe("2026-02-23");
    expect(getNextWeekStart("2026-08-31")).toBe("2026-09-07");
    expect(getPreviousWeekStart("2025-12-29")).toBe("2025-12-22");
    expect(getNextWeekStart("2025-12-29")).toBe("2026-01-05");
  });

  it("keeps leap day in its local calendar week", () => {
    const leapWeek = getWeekDates("2024-02-26");

    expect(leapWeek).toContain("2024-02-29");
    expect(leapWeek.at(-1)).toBe("2024-03-03");
    expect(getNextWeekStart("2024-02-26")).toBe("2024-03-04");
  });
});
