import { X } from "lucide-react";
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

const SELECTED_CHIP_CLASS = "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white";
const BAR_CHIP_CLASS = "shrink-0 rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-600";
const DIALOG_CHIP_CLASS = "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600";

export function RecipeMealTypeFilters({ mealTypes, onClear, onToggle }: RecipeMealTypeFiltersProps) {
  return (
    <section className="mt-5 flex gap-2 overflow-x-auto" aria-label="Meal type filters">
      <button
        className={mealTypes.length === 0 ? `shrink-0 ${SELECTED_CHIP_CLASS}` : BAR_CHIP_CLASS}
        onClick={onClear}
        type="button"
      >
        All
      </button>
      {MEAL_TYPE_FILTERS.map((filter) => {
        const isSelected = mealTypes.includes(filter.value);

        return (
          <button
            aria-pressed={isSelected}
            className={isSelected ? `shrink-0 ${SELECTED_CHIP_CLASS}` : BAR_CHIP_CLASS}
            key={filter.value}
            onClick={() => onToggle(filter.value)}
            type="button"
          >
            {filter.label}
          </button>
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
              <button className={mealTypes.length === 0 ? SELECTED_CHIP_CLASS : DIALOG_CHIP_CLASS} onClick={onClear} type="button">
                All
              </button>
              {MEAL_TYPE_FILTERS.map((filter) => {
                const isSelected = mealTypes.includes(filter.value);

                return (
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? SELECTED_CHIP_CLASS : DIALOG_CHIP_CLASS}
                    key={filter.value}
                    onClick={() => onMealTypeToggle(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
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
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? SELECTED_CHIP_CLASS : DIALOG_CHIP_CLASS}
                    key={filter.value}
                    onClick={() => onCostRatingToggle(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
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
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? SELECTED_CHIP_CLASS : DIALOG_CHIP_CLASS}
                    key={filter.value}
                    onClick={() => onDifficultyChange(isSelected ? undefined : filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600" onClick={onClear} type="button">
            Clear
          </button>
          <button className="rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
