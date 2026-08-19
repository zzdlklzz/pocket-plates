"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { EFFORT_PRESETS } from "./recipe-discovery.constants";
import type { RecipeEffortLabel, RecipeFormValues } from "./recipe.types";

export function RecipeDiscoveryFields() {
  const {
    control,
    formState: { errors },
    setValue
  } = useFormContext<RecipeFormValues>();
  const selectedEffortLabels = useWatch({ control, name: "effortLabels" }) ?? [];

  function toggleEffortLabel(effortLabel: RecipeEffortLabel) {
    setValue(
      "effortLabels",
      selectedEffortLabels.includes(effortLabel)
        ? selectedEffortLabels.filter((selected) => selected !== effortLabel)
        : [...selectedEffortLabels, effortLabel],
      { shouldDirty: true, shouldValidate: true }
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-800">Effort</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Optional. Choose every description that applies.</p>
      <div className="mt-3 space-y-2">
        {EFFORT_PRESETS.map((preset) => {
          const descriptionId = `effort-${preset.value}-description`;

          return (
            <div className="rounded-lg border border-slate-200 bg-white p-3" key={preset.value}>
              <SelectableChip
                aria-describedby={descriptionId}
                onClick={() => toggleEffortLabel(preset.value)}
                selected={selectedEffortLabels.includes(preset.value)}
              >
                {preset.label}
              </SelectableChip>
              <p className="mt-2 text-xs leading-5 text-slate-500" id={descriptionId}>
                {preset.description}
              </p>
            </div>
          );
        })}
      </div>
      {errors.effortLabels ? <p className="mt-2 text-sm text-red-700">{errors.effortLabels.message}</p> : null}
    </section>
  );
}
