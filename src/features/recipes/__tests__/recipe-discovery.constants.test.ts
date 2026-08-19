import { describe, expect, it } from "vitest";
import {
  EFFORT_LABELS,
  EFFORT_LABEL_VALUES,
  EFFORT_PRESETS,
  sortEffortLabels
} from "../recipe-discovery.constants";

describe("effort presets", () => {
  it("keeps stable keys and display labels unique", () => {
    expect(new Set(EFFORT_LABEL_VALUES).size).toBe(EFFORT_LABEL_VALUES.length);
    expect(new Set(EFFORT_PRESETS.map(({ label }) => label)).size).toBe(EFFORT_PRESETS.length);
    expect(EFFORT_PRESETS.map(({ value }) => value)).toEqual(EFFORT_LABEL_VALUES);
    expect(EFFORT_PRESETS.map(({ value }) => EFFORT_LABELS[value])).toEqual(
      EFFORT_PRESETS.map(({ label }) => label)
    );
  });

  it("sorts saved labels into the application display order", () => {
    expect(sortEffortLabels(["low_cleanup", "quick", "one_pot"])).toEqual([
      "quick",
      "one_pot",
      "low_cleanup"
    ]);
  });
});
