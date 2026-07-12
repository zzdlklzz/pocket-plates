"use client";

import { Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_METADATA } from "@/app/app.constants";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { getRecipeErrorMessage } from "./recipe.errors";
import { MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import { useRecipeList } from "./recipe.queries";
import { RecipeCard } from "./recipe-card";
import type { MealType } from "./recipe.types";

type RecipeLibraryProps = {
  profileLabel: string;
};

export function RecipeLibrary({ profileLabel }: RecipeLibraryProps) {
  const [search, setSearch] = useState("");
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const filters = useMemo(
    () => ({
      search,
      mealTypes
    }),
    [mealTypes, search]
  );
  const { data: recipes = [], error, isLoading } = useRecipeList(filters);

  function toggleMealType(mealType: MealType) {
    setMealTypes((current) =>
      current.includes(mealType) ? current.filter((selected) => selected !== mealType) : [...current, mealType]
    );
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

      <section className="mt-5" aria-label="Recipe library">
        {isLoading ? <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading recipes...</p> : null}
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
        <button className="flex items-center gap-1" type="button">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </nav>
    </main>
  );
}
