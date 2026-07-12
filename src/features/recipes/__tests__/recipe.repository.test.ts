import { describe, expect, it } from "vitest";
import { getMealTypeFilterValues } from "../recipe.repository";

describe("getMealTypeFilterValues", () => {
  it("keeps flexible-only filters exact", () => {
    expect(getMealTypeFilterValues(["flexible"])).toEqual(["flexible"]);
  });

  it("includes flexible recipes when filtering by a specific meal type", () => {
    expect(getMealTypeFilterValues(["breakfast"])).toEqual(["breakfast", "flexible"]);
  });

  it("deduplicates flexible when it is already selected with specific meal types", () => {
    expect(getMealTypeFilterValues(["dinner", "flexible", "lunch"])).toEqual(["dinner", "flexible", "lunch"]);
  });
});
