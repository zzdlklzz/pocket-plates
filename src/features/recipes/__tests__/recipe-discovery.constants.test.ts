import { describe, expect, it } from "vitest";
import {
  EFFORT_LABELS,
  EFFORT_LABEL_VALUES,
  EFFORT_PRESETS,
  EQUIPMENT_LABELS,
  EQUIPMENT_PRESET_VALUES,
  EQUIPMENT_PRESETS,
  isEquipmentPresetKey,
  sortEquipmentKeys,
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

  it("keeps equipment keys and display labels unique and ordered", () => {
    expect(new Set(EQUIPMENT_PRESET_VALUES).size).toBe(EQUIPMENT_PRESET_VALUES.length);
    expect(new Set(EQUIPMENT_PRESETS.map(({ label }) => label)).size).toBe(EQUIPMENT_PRESETS.length);
    expect(EQUIPMENT_PRESETS.map(({ value }) => value)).toEqual(EQUIPMENT_PRESET_VALUES);
    expect(EQUIPMENT_PRESETS.map(({ value }) => EQUIPMENT_LABELS[value])).toEqual(
      EQUIPMENT_PRESETS.map(({ label }) => label)
    );
    expect(sortEquipmentKeys(["no_oven", "microwave", "blender"])).toEqual([
      "microwave",
      "blender",
      "no_oven"
    ]);
    expect(isEquipmentPresetKey("rice_cooker")).toBe(true);
    expect(isEquipmentPresetKey("air_fryer")).toBe(false);
    expect(isEquipmentPresetKey(null)).toBe(false);
  });
});
