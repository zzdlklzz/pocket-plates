import { describe, expect, it } from "vitest";
import {
  formatGroceryListWeekRange,
  formatMealPlanGroceryListTitle
} from "../grocery-list.week-formatting";

describe("grocery-list week formatting", () => {
  it("uses one compact label across a single month", () => {
    expect(formatGroceryListWeekRange("2026-08-17")).toBe("17–23 Aug");
  });

  it("keeps both month labels across a month boundary", () => {
    expect(formatGroceryListWeekRange("2026-08-31")).toBe("31 Aug–6 Sep");
  });

  it("returns null for missing or invalid source dates", () => {
    expect(formatGroceryListWeekRange(null)).toBeNull();
    expect(formatGroceryListWeekRange("not-a-date")).toBeNull();
  });

  it("builds an unambiguous default title without changing compact labels", () => {
    expect(formatMealPlanGroceryListTitle("2026-08-17")).toBe(
      "Groceries · 17–23 Aug 2026"
    );
    expect(formatMealPlanGroceryListTitle("2026-12-28")).toBe(
      "Groceries · 28 Dec 2026–3 Jan 2027"
    );
    expect(formatMealPlanGroceryListTitle("not-a-date")).toBeNull();
  });
});
