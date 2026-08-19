import type { RecipeEffortLabel } from "./recipe.types";

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
