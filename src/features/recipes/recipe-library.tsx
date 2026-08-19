"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_METADATA } from "@/app/app.constants";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getRecipeErrorMessage } from "./recipe.errors";
import { RecipeFilterControls, RecipeFilterDialog } from "./recipe-filters";
import { useRecipeList } from "./recipe.queries";
import { RecipeCard } from "./recipe-card";
import { RecipeNavigation } from "./recipe-navigation";
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

      <RecipeFilterControls
        costRatings={costRatings}
        difficulty={difficulty}
        mealTypes={mealTypes}
        onClear={clearFilters}
        onCostRatingRemove={toggleCostRating}
        onDifficultyRemove={() => setDifficulty(undefined)}
        onFilterOpen={() => setIsFilterOpen(true)}
        onMealTypeRemove={toggleMealType}
      />

      {isFilterOpen ? (
        <RecipeFilterDialog
          costRatings={costRatings}
          difficulty={difficulty}
          mealTypes={mealTypes}
          onClear={clearFilters}
          onClose={() => setIsFilterOpen(false)}
          onCostRatingToggle={toggleCostRating}
          onDifficultyChange={setDifficulty}
          onMealTypesClear={() => setMealTypes([])}
          onMealTypeToggle={toggleMealType}
        />
      ) : null}

      <section className="mt-5" aria-label="Recipe library">
        {isLoading ? (
          <div role="status" aria-label="Loading recipes">
            <RecipeGridSkeleton />
          </div>
        ) : null}
        {error ? <InlineNotice tone="error">{getRecipeErrorMessage(error, "loadList")}</InlineNotice> : null}
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

      <RecipeNavigation activePage="home" />
    </AppPageShell>
  );
}
