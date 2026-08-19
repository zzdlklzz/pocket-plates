import { SlidersHorizontal, X } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { EFFORT_PRESETS, EQUIPMENT_PRESETS } from "./recipe-discovery.constants";
import { COST_RATING_FILTERS, DIFFICULTY_FILTERS, MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import type {
  CostRating,
  DifficultyLevel,
  EquipmentPresetKey,
  MealType,
  RecipeEffortLabel
} from "./recipe.types";

type RecipeFilterControlsProps = {
  costRatings: CostRating[];
  difficulty?: DifficultyLevel;
  effortLabels: RecipeEffortLabel[];
  equipmentKeys: EquipmentPresetKey[];
  filterTriggerRef: RefObject<HTMLButtonElement | null>;
  mealTypes: MealType[];
  onClear: () => void;
  onCostRatingRemove: (costRating: CostRating) => void;
  onDifficultyRemove: () => void;
  onEffortLabelRemove: (effortLabel: RecipeEffortLabel) => void;
  onEquipmentKeyRemove: (equipmentKey: EquipmentPresetKey) => void;
  onFilterOpen: () => void;
  onMealTypeRemove: (mealType: MealType) => void;
};

type RecipeFilterDialogProps = {
  costRatings: CostRating[];
  difficulty?: DifficultyLevel;
  effortLabels: RecipeEffortLabel[];
  equipmentKeys: EquipmentPresetKey[];
  filterTriggerRef: RefObject<HTMLButtonElement | null>;
  mealTypes: MealType[];
  onClear: () => void;
  onClose: () => void;
  onDifficultyChange: (difficulty?: DifficultyLevel) => void;
  onEffortLabelToggle: (effortLabel: RecipeEffortLabel) => void;
  onEquipmentKeyToggle: (equipmentKey: EquipmentPresetKey) => void;
  onMealTypesClear: () => void;
  onMealTypeToggle: (mealType: MealType) => void;
  onCostRatingToggle: (costRating: CostRating) => void;
};

export function RecipeFilterControls({
  costRatings,
  difficulty,
  effortLabels,
  equipmentKeys,
  filterTriggerRef,
  mealTypes,
  onClear,
  onCostRatingRemove,
  onDifficultyRemove,
  onEffortLabelRemove,
  onEquipmentKeyRemove,
  onFilterOpen,
  onMealTypeRemove
}: RecipeFilterControlsProps) {
  const activeFilterCount =
    mealTypes.length +
    costRatings.length +
    effortLabels.length +
    equipmentKeys.length +
    (difficulty ? 1 : 0);

  return (
    <section className="mt-5 flex flex-wrap items-center gap-2" aria-label="Recipe filters">
      <button
        aria-haspopup="dialog"
        aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        onClick={onFilterOpen}
        ref={filterTriggerRef}
        type="button"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
        {activeFilterCount ? (
          <span
            aria-hidden="true"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-leaf-700 px-1 text-xs text-white"
          >
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {activeFilterCount ? (
        <>
          {MEAL_TYPE_FILTERS.filter(({ value }) => mealTypes.includes(value)).map(({ label, value }) => (
            <AppliedFilterChip category="Meal type" key={`meal-${value}`} label={label} onRemove={() => onMealTypeRemove(value)} />
          ))}
          {COST_RATING_FILTERS.filter(({ value }) => costRatings.includes(value)).map(({ label, value }) => (
            <AppliedFilterChip category="Cost" key={`cost-${value}`} label={label} onRemove={() => onCostRatingRemove(value)} />
          ))}
          {DIFFICULTY_FILTERS.filter(({ value }) => difficulty === value).map(({ label, value }) => (
            <AppliedFilterChip category="Difficulty" key={`difficulty-${value}`} label={label} onRemove={onDifficultyRemove} />
          ))}
          {EFFORT_PRESETS.filter(({ value }) => effortLabels.includes(value)).map(({ label, value }) => (
            <AppliedFilterChip
              category="Effort"
              key={`effort-${value}`}
              label={label}
              onRemove={() => onEffortLabelRemove(value)}
            />
          ))}
          {EQUIPMENT_PRESETS.filter(({ value }) => equipmentKeys.includes(value)).map(({ label, value }) => (
            <AppliedFilterChip
              category="Equipment"
              key={`equipment-${value}`}
              label={label}
              onRemove={() => onEquipmentKeyRemove(value)}
            />
          ))}
          {activeFilterCount > 1 ? (
            <button className="px-2 text-xs font-semibold text-slate-500" onClick={onClear} type="button">
              Clear all
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AppliedFilterChip({
  category,
  label,
  onRemove
}: {
  category: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      aria-label={`Remove ${category}: ${label} filter`}
      className="inline-flex items-center gap-1 rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-700"
      onClick={onRemove}
      type="button"
    >
      {label}
      <X className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
    </button>
  );
}

export function RecipeFilterDialog({
  costRatings,
  difficulty,
  effortLabels,
  equipmentKeys,
  filterTriggerRef,
  mealTypes,
  onClear,
  onClose,
  onCostRatingToggle,
  onDifficultyChange,
  onEffortLabelToggle,
  onEquipmentKeyToggle,
  onMealTypesClear,
  onMealTypeToggle
}: RecipeFilterDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const filterTrigger = filterTriggerRef.current;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      filterTrigger?.focus();
    };
  }, [filterTriggerRef, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label="Recipe filters"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white p-4 shadow-xl"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <button
            aria-label="Close filters"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          <section>
            <h3 className="text-sm font-semibold text-slate-800">Meal type</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <SelectableChip onClick={onMealTypesClear} selected={mealTypes.length === 0} surface="plain">
                All
              </SelectableChip>
              {MEAL_TYPE_FILTERS.map((filter) => {
                const isSelected = mealTypes.includes(filter.value);

                return (
                  <SelectableChip
                    key={filter.value}
                    onClick={() => onMealTypeToggle(filter.value)}
                    selected={isSelected}
                    surface="plain"
                  >
                    {filter.label}
                  </SelectableChip>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">Cost</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {COST_RATING_FILTERS.map((filter) => {
                const isSelected = costRatings.includes(filter.value);

                return (
                  <SelectableChip
                    key={filter.value}
                    onClick={() => onCostRatingToggle(filter.value)}
                    selected={isSelected}
                    surface="plain"
                  >
                    {filter.label}
                  </SelectableChip>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">Difficulty</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTY_FILTERS.map((filter) => {
                const isSelected = difficulty === filter.value;

                return (
                  <SelectableChip
                    key={filter.value}
                    onClick={() => onDifficultyChange(isSelected ? undefined : filter.value)}
                    selected={isSelected}
                    surface="plain"
                  >
                    {filter.label}
                  </SelectableChip>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">Effort</h3>
            <p className="mt-1 text-xs text-slate-500">Recipes must match every selected effort.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EFFORT_PRESETS.map((filter) => (
                <SelectableChip
                  key={filter.value}
                  onClick={() => onEffortLabelToggle(filter.value)}
                  selected={effortLabels.includes(filter.value)}
                  surface="plain"
                >
                  {filter.label}
                </SelectableChip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">Equipment & setup</h3>
            <p className="mt-1 text-xs text-slate-500">Recipes must match every selected option.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EQUIPMENT_PRESETS.map((filter) => (
                <SelectableChip
                  key={filter.value}
                  onClick={() => onEquipmentKeyToggle(filter.value)}
                  selected={equipmentKeys.includes(filter.value)}
                  surface="plain"
                >
                  {filter.label}
                </SelectableChip>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid shrink-0 grid-cols-2 gap-3">
          <ActionButton fullWidth onClick={onClear} variant="secondary">
            Clear
          </ActionButton>
          <ActionButton fullWidth onClick={onClose}>
            Done
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
