import type { EquipmentPresetKey, RecipeEffortLabel } from "./recipe.types";

export const EFFORT_LABEL_VALUES = ["quick", "make_ahead", "one_pot", "low_cleanup"] as const;

export const EFFORT_PRESETS = [
  {
    description: "Can reasonably be completed in about 30 minutes or less.",
    label: "Quick",
    value: "quick"
  },
  {
    description: "Can be prepared substantially in advance and served or reheated later.",
    label: "Make ahead",
    value: "make_ahead"
  },
  {
    description: "Primary cooking uses one pot, pan, tray, or cooking vessel.",
    label: "One pot",
    value: "one_pot"
  },
  {
    description: "Deliberately minimizes preparation and washing up.",
    label: "Low cleanup",
    value: "low_cleanup"
  }
] as const satisfies readonly {
  description: string;
  label: string;
  value: RecipeEffortLabel;
}[];

export const EFFORT_LABELS: Record<RecipeEffortLabel, string> = {
  quick: "Quick",
  make_ahead: "Make ahead",
  one_pot: "One pot",
  low_cleanup: "Low cleanup"
};

const EFFORT_ORDER = new Map(EFFORT_LABEL_VALUES.map((value, index) => [value, index]));

export function sortEffortLabels(values: RecipeEffortLabel[]) {
  return values.slice().sort((left, right) => EFFORT_ORDER.get(left)! - EFFORT_ORDER.get(right)!);
}

export const EQUIPMENT_PRESET_VALUES = [
  "microwave",
  "rice_cooker",
  "stovetop",
  "oven",
  "blender",
  "no_oven"
] as const;

export const EQUIPMENT_PRESETS = [
  {
    description: "Uses a microwave.",
    label: "Microwave",
    value: "microwave"
  },
  {
    description: "Uses a rice cooker or an equivalent multicooker mode.",
    label: "Rice cooker",
    value: "rice_cooker"
  },
  {
    description: "Uses a hob or burner with a pot or pan.",
    label: "Stovetop",
    value: "stovetop"
  },
  {
    description: "Requires an oven.",
    label: "Oven",
    value: "oven"
  },
  {
    description: "Requires a countertop or immersion blender.",
    label: "Blender",
    value: "blender"
  },
  {
    description: "Is intentionally suitable without an oven.",
    label: "No oven needed",
    value: "no_oven"
  }
] as const satisfies readonly {
  description: string;
  label: string;
  value: EquipmentPresetKey;
}[];

export const EQUIPMENT_LABELS: Record<EquipmentPresetKey, string> = {
  microwave: "Microwave",
  rice_cooker: "Rice cooker",
  stovetop: "Stovetop",
  oven: "Oven",
  blender: "Blender",
  no_oven: "No oven needed"
};

const EQUIPMENT_PRESET_SET = new Set<string>(EQUIPMENT_PRESET_VALUES);
const EQUIPMENT_ORDER = new Map(EQUIPMENT_PRESET_VALUES.map((value, index) => [value, index]));

export function isEquipmentPresetKey(value: string | null): value is EquipmentPresetKey {
  return value !== null && EQUIPMENT_PRESET_SET.has(value);
}

export function sortEquipmentKeys(values: EquipmentPresetKey[]) {
  return values.slice().sort((left, right) => EQUIPMENT_ORDER.get(left)! - EQUIPMENT_ORDER.get(right)!);
}
