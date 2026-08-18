import { X } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { SelectableChip } from "@/components/ui/selectable-chip";
import { COST_RATING_FILTERS, DIFFICULTY_FILTERS, MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import type { CostRating, DifficultyLevel, MealType } from "./recipe.types";

type RecipeMealTypeFiltersProps = {
  mealTypes: MealType[];
  onClear: () => void;
  onToggle: (mealType: MealType) => void;
};

type RecipeFilterDialogProps = {
  costRatings: CostRating[];
  difficulty?: DifficultyLevel;
  mealTypes: MealType[];
  onClear: () => void;
  onClose: () => void;
  onDifficultyChange: (difficulty?: DifficultyLevel) => void;
  onMealTypeToggle: (mealType: MealType) => void;
  onCostRatingToggle: (costRating: CostRating) => void;
};

export function RecipeMealTypeFilters({ mealTypes, onClear, onToggle }: RecipeMealTypeFiltersProps) {
  return (
    <section className="mt-5 flex gap-2 overflow-x-auto" aria-label="Meal type filters">
      <SelectableChip
        className="shrink-0"
        onClick={onClear}
        selected={mealTypes.length === 0}
      >
        All
      </SelectableChip>
      {MEAL_TYPE_FILTERS.map((filter) => {
        const isSelected = mealTypes.includes(filter.value);

        return (
          <SelectableChip
            className="shrink-0"
            key={filter.value}
            onClick={() => onToggle(filter.value)}
            selected={isSelected}
          >
            {filter.label}
          </SelectableChip>
        );
      })}
    </section>
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
  onMealTypeToggle
}: RecipeFilterDialogProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/30 px-4 pb-4" role="presentation">
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
              <SelectableChip onClick={onClear} selected={mealTypes.length === 0} surface="plain">
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
