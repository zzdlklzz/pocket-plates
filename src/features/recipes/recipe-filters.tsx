import { SlidersHorizontal, X } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { COST_RATING_FILTERS, DIFFICULTY_FILTERS, MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import type { CostRating, DifficultyLevel, MealType } from "./recipe.types";

type RecipeFilterControlsProps = {
  costRatings: CostRating[];
  difficulty?: DifficultyLevel;
  mealTypes: MealType[];
  onClear: () => void;
  onCostRatingRemove: (costRating: CostRating) => void;
  onDifficultyRemove: () => void;
  onFilterOpen: () => void;
  onMealTypeRemove: (mealType: MealType) => void;
};

type RecipeFilterDialogProps = {
  costRatings: CostRating[];
  difficulty?: DifficultyLevel;
  mealTypes: MealType[];
  onClear: () => void;
  onClose: () => void;
  onDifficultyChange: (difficulty?: DifficultyLevel) => void;
  onMealTypesClear: () => void;
  onMealTypeToggle: (mealType: MealType) => void;
  onCostRatingToggle: (costRating: CostRating) => void;
};

export function RecipeFilterControls({
  costRatings,
  difficulty,
  mealTypes,
  onClear,
  onCostRatingRemove,
  onDifficultyRemove,
  onFilterOpen,
  onMealTypeRemove
}: RecipeFilterControlsProps) {
  const activeFilterCount = mealTypes.length + costRatings.length + (difficulty ? 1 : 0);

  return (
    <section className="mt-5 flex flex-wrap items-center gap-2" aria-label="Recipe filters">
      <button
        aria-haspopup="dialog"
        aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        onClick={onFilterOpen}
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
            <AppliedFilterChip key={`meal-${value}`} label={label} onRemove={() => onMealTypeRemove(value)} />
          ))}
          {COST_RATING_FILTERS.filter(({ value }) => costRatings.includes(value)).map(({ label, value }) => (
            <AppliedFilterChip key={`cost-${value}`} label={label} onRemove={() => onCostRatingRemove(value)} />
          ))}
          {DIFFICULTY_FILTERS.filter(({ value }) => difficulty === value).map(({ label, value }) => (
            <AppliedFilterChip key={`difficulty-${value}`} label={label} onRemove={onDifficultyRemove} />
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

function AppliedFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      aria-label={`Remove ${label} filter`}
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
  mealTypes,
  onClear,
  onClose,
  onCostRatingToggle,
  onDifficultyChange,
  onMealTypesClear,
  onMealTypeToggle
}: RecipeFilterDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 px-4 pb-4" role="presentation">
      <section aria-label="Recipe filters" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl" role="dialog">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <button
            aria-label="Close filters"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
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
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
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
