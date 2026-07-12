"use client";

import Link from "next/link";
import { getRecipeErrorMessage } from "./recipe.errors";
import { toRecipeFormValues } from "./recipe.mappers";
import { useRecipeDetail } from "./recipe.queries";
import { RecipeForm } from "./recipe-form";
import { RecipeFormSkeleton } from "./recipe-skeletons";

type RecipeEditProps = {
  id: string;
};

export function RecipeEdit({ id }: RecipeEditProps) {
  const { data: recipe, error, isLoading } = useRecipeDetail(id);

  if (isLoading) {
    return <RecipeFormSkeleton />;
  }

  if (error || !recipe) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 py-8 shadow-sm">
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {error ? getRecipeErrorMessage(error, "loadDetail") : "We could not find this recipe."}
        </p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-leaf-700" href="/">
          Back to library
        </Link>
      </main>
    );
  }

  return <RecipeForm initialValues={toRecipeFormValues(recipe)} recipeId={id} />;
}
