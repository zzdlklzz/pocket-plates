"use client";

import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_METADATA } from "@/app/app.constants";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getRecipeErrorMessage } from "./recipe.errors";
import { COST_RATING_FILTERS, DIFFICULTY_FILTERS, MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import { useRecipeList } from "./recipe.queries";
import { RecipeCard } from "./recipe-card";
import { RecipeGridSkeleton } from "./recipe-skeletons";
import type { CostRating, DifficultyLevel, MealType } from "./recipe.types";

type RecipeLibraryProps = {
  profileLabel: string;
};

export function RecipeLibrary({ profileLabel }: RecipeLibraryProps) {
  const [search, setSearch] = useState("");
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [costRatings, setCostRatings] = useState<CostRating[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | undefined>();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filters = useMemo(
    () => ({
      search,
      mealTypes,
      costRatings,
      difficulty
    }),
    [costRatings, difficulty, mealTypes, search]
  );
  const { data: recipes = [], error, isLoading } = useRecipeList(filters);
  const activeFilterCount = mealTypes.length + costRatings.length + (difficulty ? 1 : 0);

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

  function clearFilters() {
    setMealTypes([]);
    setCostRatings([]);
    setDifficulty(undefined);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">
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
          <span className="sr-only">Search recipes</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes"
            type="search"
            value={search}
          />
        </label>
      </header>

      <section className="mt-5 flex gap-2 overflow-x-auto" aria-label="Meal type filters">
        <button
          className={
            mealTypes.length === 0
              ? "shrink-0 rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
              : "shrink-0 rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-600"
          }
          onClick={() => setMealTypes([])}
          type="button"
        >
          All
        </button>
        {MEAL_TYPE_FILTERS.map((filter) => {
          const isSelected = mealTypes.includes(filter.value);

          return (
            <button
              aria-pressed={isSelected}
              className={
                isSelected
                  ? "shrink-0 rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                  : "shrink-0 rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-600"
              }
              key={filter.value}
              onClick={() => toggleMealType(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </section>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/30 px-4 pb-4" role="presentation">
          <section
            aria-label="Recipe filters"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <button
                aria-label="Close filters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                onClick={() => setIsFilterOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <section>
                <h3 className="text-sm font-semibold text-slate-800">Meal type</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className={
                      mealTypes.length === 0
                        ? "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                        : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                    }
                    onClick={() => setMealTypes([])}
                    type="button"
                  >
                    All
                  </button>
                  {MEAL_TYPE_FILTERS.map((filter) => {
                    const isSelected = mealTypes.includes(filter.value);

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                            : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                        }
                        key={filter.value}
                        onClick={() => toggleMealType(filter.value)}
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
                        className={
                          isSelected
                            ? "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                            : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                        }
                        key={filter.value}
                        onClick={() => toggleCostRating(filter.value)}
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
                        className={
                          isSelected
                            ? "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                            : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                        }
                        key={filter.value}
                        onClick={() => setDifficulty(isSelected ? undefined : filter.value)}
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
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                onClick={clearFilters}
                type="button"
              >
                Clear
              </button>
              <button
                className="rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => setIsFilterOpen(false)}
                type="button"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="mt-5" aria-label="Recipe library">
        {isLoading ? (
          <div role="status" aria-label="Loading recipes">
            <RecipeGridSkeleton />
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {getRecipeErrorMessage(error, "loadList")}
          </p>
        ) : null}
        {!isLoading && !error && recipes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">No recipes yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your saved recipes will appear here once you add them.
            </p>
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

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-around border-t border-slate-200 bg-leaf-50 px-5 py-4 text-sm text-slate-600">
        <button className="font-semibold text-leaf-700" type="button">
          Home
        </button>
        <Link className="rounded-full bg-leaf-700 p-3 text-white" href="/recipes/new" aria-label="Add recipe">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Link>
        <button
          aria-haspopup="dialog"
          className={activeFilterCount ? "flex items-center gap-1 font-semibold text-leaf-700" : "flex items-center gap-1"}
          onClick={() => setIsFilterOpen(true)}
          type="button"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter{activeFilterCount ? ` ${activeFilterCount}` : ""}
        </button>
      </nav>
    </main>
  );
}
