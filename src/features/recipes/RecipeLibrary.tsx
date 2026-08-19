"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_METADATA } from "@/app/app.constants";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { getRecipeErrorMessage } from "./recipe.errors";
import { RecipeFilterControls, RecipeFilterDialog } from "./recipe-filters";
import { useRecipeList } from "./recipe.queries";
import { RecipeCard } from "./RecipeCard";
import { RecipeNavigation } from "./RecipeNavigation";
import { RECIPE_SEARCH_DEBOUNCE_MS } from "./recipe-library.constants";
import { RecipeGridSkeleton } from "./recipe-skeletons";
import type { CostRating, DifficultyLevel, MealType, RecipeEffortLabel } from "./recipe.types";

type RecipeLibraryProps = {
  profileLabel: string;
};

export function RecipeLibrary({ profileLabel }: RecipeLibraryProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [costRatings, setCostRatings] = useState<CostRating[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | undefined>();
  const [effortLabels, setEffortLabels] = useState<RecipeEffortLabel[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      mealTypes,
      costRatings,
      difficulty,
      effortLabels
    }),
    [costRatings, debouncedSearch, difficulty, effortLabels, mealTypes]
  );
  const { data: recipes = [], error, isFetching, isLoading } = useRecipeList(filters);
  const normalizedSearch = search.trim();
  const hasActiveFilters =
    mealTypes.length > 0 || costRatings.length > 0 || Boolean(difficulty) || effortLabels.length > 0;
  const hasActiveCriteria = Boolean(normalizedSearch) || hasActiveFilters;
  const isUpdating = !isLoading && (normalizedSearch !== debouncedSearch || isFetching);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, RECIPE_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedSearch]);

  function toggleMealType(mealType: MealType) {
    setMealTypes((current) =>
      current.includes(mealType) ? current.filter((selected) => selected !== mealType) : [...current, mealType]
    );
  }

  function toggleCostRating(costRating: CostRating) {
    setCostRatings((current) =>
      current.includes(costRating) ? current.filter((selected) => selected !== costRating) : [...current, costRating]
    );
  }

  function toggleEffortLabel(effortLabel: RecipeEffortLabel) {
    setEffortLabels((current) =>
      current.includes(effortLabel)
        ? current.filter((selected) => selected !== effortLabel)
        : [...current, effortLabel]
    );
  }

  function clearFilters() {
    setMealTypes([]);
    setCostRatings([]);
    setDifficulty(undefined);
    setEffortLabels([]);
  }

  return (
    <AppPageShell>
      <header className="space-y-4 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800">{APP_METADATA.name}</h1>
            <p className="mt-1 truncate text-xs text-slate-500">{profileLabel}</p>
          </div>
          <SignOutButton />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Search titles or ingredients</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles or ingredients"
            type="search"
            value={search}
          />
        </label>
      </header>

      <RecipeFilterControls
        costRatings={costRatings}
        difficulty={difficulty}
        effortLabels={effortLabels}
        mealTypes={mealTypes}
        onClear={clearFilters}
        onCostRatingRemove={toggleCostRating}
        onDifficultyRemove={() => setDifficulty(undefined)}
        onEffortLabelRemove={toggleEffortLabel}
        onFilterOpen={() => setIsFilterOpen(true)}
        onMealTypeRemove={toggleMealType}
      />

      {isFilterOpen ? (
        <RecipeFilterDialog
          costRatings={costRatings}
          difficulty={difficulty}
          effortLabels={effortLabels}
          mealTypes={mealTypes}
          onClear={clearFilters}
          onClose={() => setIsFilterOpen(false)}
          onCostRatingToggle={toggleCostRating}
          onDifficultyChange={setDifficulty}
          onEffortLabelToggle={toggleEffortLabel}
          onMealTypesClear={() => setMealTypes([])}
          onMealTypeToggle={toggleMealType}
        />
      ) : null}

      <section aria-busy={isUpdating || isLoading} className="mt-5" aria-label="Recipe library">
        {isUpdating ? (
          <p aria-live="polite" className="mb-3 text-xs font-medium text-slate-500" role="status">
            Updating recipes...
          </p>
        ) : null}
        {isLoading ? (
          <div role="status" aria-label="Loading recipes">
            <RecipeGridSkeleton />
          </div>
        ) : null}
        {error ? <InlineNotice tone="error">{getRecipeErrorMessage(error, "loadList")}</InlineNotice> : null}
        {!isLoading && !isUpdating && !error && recipes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">
              {hasActiveCriteria ? "No matching recipes" : "No recipes yet"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {hasActiveCriteria
                ? "Try another search or clear some filters."
                : "Your saved recipes will appear here once you add them."}
            </p>
            {hasActiveCriteria ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {normalizedSearch ? (
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setSearch("")}
                    type="button"
                  >
                    Clear search
                  </button>
                ) : null}
                {hasActiveFilters ? (
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {recipes.length ? (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <Link href={`/recipes/${recipe.id}`} key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <RecipeNavigation activePage="home" />
    </AppPageShell>
  );
}
