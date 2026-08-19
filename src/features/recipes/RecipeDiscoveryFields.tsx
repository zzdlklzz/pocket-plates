"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { EFFORT_PRESETS, EQUIPMENT_PRESETS } from "./recipe-discovery.constants";
import type { EquipmentPresetKey, RecipeEffortLabel, RecipeFormValues } from "./recipe.types";

export function RecipeDiscoveryFields() {
  const {
    control,
    formState: { errors },
    setValue
  } = useFormContext<RecipeFormValues>();
  const selectedEffortLabels = useWatch({ control, name: "effortLabels" }) ?? [];
  const selectedEquipmentKeys = useWatch({ control, name: "equipmentKeys" }) ?? [];

  function toggleEffortLabel(effortLabel: RecipeEffortLabel) {
    setValue(
      "effortLabels",
      selectedEffortLabels.includes(effortLabel)
        ? selectedEffortLabels.filter((selected) => selected !== effortLabel)
        : [...selectedEffortLabels, effortLabel],
      { shouldDirty: true, shouldValidate: true }
    );
  }

  function toggleEquipmentKey(equipmentKey: EquipmentPresetKey) {
    if (selectedEquipmentKeys.includes(equipmentKey)) {
      setValue(
        "equipmentKeys",
        selectedEquipmentKeys.filter((selected) => selected !== equipmentKey),
        { shouldDirty: true, shouldValidate: true }
      );
      return;
    }

    const mutuallyExclusiveKey =
      equipmentKey === "oven" ? "no_oven" : equipmentKey === "no_oven" ? "oven" : null;
    const nextEquipmentKeys = mutuallyExclusiveKey
      ? selectedEquipmentKeys.filter((selected) => selected !== mutuallyExclusiveKey)
      : selectedEquipmentKeys;

    setValue("equipmentKeys", [...nextEquipmentKeys, equipmentKey], {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  return (
    <div className="space-y-5">
      <DiscoveryFieldSection
        description="Optional. Choose every description that applies."
        presets={EFFORT_PRESETS}
        selectedValues={selectedEffortLabels}
        title="Effort"
        onToggle={toggleEffortLabel}
      />
      {errors.effortLabels ? <p className="text-sm text-red-700">{errors.effortLabels.message}</p> : null}

      <DiscoveryFieldSection
        description="Optional. Oven and No oven needed cannot both apply."
        presets={EQUIPMENT_PRESETS}
        selectedValues={selectedEquipmentKeys}
        title="Equipment & setup"
        onToggle={toggleEquipmentKey}
      />
      {errors.equipmentKeys ? <p className="text-sm text-red-700">{errors.equipmentKeys.message}</p> : null}
    </div>
  );
}

function DiscoveryFieldSection<T extends string>({
  description,
  onToggle,
  presets,
  selectedValues,
  title
}: {
  description: string;
  onToggle: (value: T) => void;
  presets: readonly { description: string; label: string; value: T }[];
  selectedValues: T[];
  title: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      <div className="mt-3 space-y-2">
        {presets.map((preset) => {
          const descriptionId = `${title.toLowerCase().replaceAll(/[^a-z]+/g, "-")}-${preset.value}-description`;

          return (
            <div className="rounded-lg border border-slate-200 bg-white p-3" key={preset.value}>
              <SelectableChip
                aria-describedby={descriptionId}
                onClick={() => onToggle(preset.value)}
                selected={selectedValues.includes(preset.value)}
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
    </section>
  );
}
