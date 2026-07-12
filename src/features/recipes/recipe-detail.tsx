"use client";

import { ArrowLeft, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getRecipeErrorMessage } from "./recipe.errors";
import { MEAL_TYPE_LABELS } from "./recipe-library.constants";
import { useArchiveRecipe, useRecipeDetail } from "./recipe.queries";
import { RecipeDetailSkeleton } from "./recipe-skeletons";

type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const router = useRouter();
  const [isRedirecting, startRedirect] = useTransition();
  const { data: recipe, error, isLoading } = useRecipeDetail(id);
  const archiveRecipe = useArchiveRecipe();
  const isArchiving = archiveRecipe.isPending || isRedirecting;

  async function handleArchive() {
    if (isArchiving) {
      return;
    }

    await archiveRecipe.mutateAsync(id);
    startRedirect(() => {
      router.push("/");
    });
  }

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (error || !recipe) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 py-8 shadow-sm">
        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700" href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {error ? getRecipeErrorMessage(error, "loadDetail") : "We could not find this recipe."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">
      <div className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700" href="/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Library
        </Link>
        <Link className="inline-flex items-center gap-1 rounded-lg border border-leaf-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700" href={`/recipes/${id}/edit`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Link>
      </div>

      <section className="mt-5 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
        <h1 className="text-3xl font-bold text-slate-900">{recipe.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
          </span>
          {recipe.mealTypes.map((mealType) => (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600" key={mealType}>
              {MEAL_TYPE_LABELS[mealType]}
            </span>
          ))}
        </div>
        {recipe.sourceUrl ? (
          <a className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-leaf-700" href={recipe.sourceUrl} rel="noreferrer" target="_blank">
            Source
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </section>

      {recipe.notes ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{recipe.notes}</p>
        </section>
      ) : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Ingredients</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${ingredient.name}-${index}`}>
              {ingredient.amount ? `${ingredient.amount} ` : ""}
              {ingredient.unit ? `${ingredient.unit} ` : ""}
              {ingredient.name}
              {ingredient.notes ? `, ${ingredient.notes}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Steps</h2>
        <ol className="mt-3 space-y-3 text-sm text-slate-600">
          {recipe.steps.map((step, index) => (
            <li className="flex gap-3" key={`${step.instruction}-${index}`}>
              <span className="font-semibold text-leaf-700">{index + 1}</span>
              <span>{step.instruction}</span>
            </li>
          ))}
        </ol>
      </section>

      {archiveRecipe.error ? (
        <p className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {getRecipeErrorMessage(archiveRecipe.error, "archive")}
        </p>
      ) : null}

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-red-700 disabled:text-slate-400"
        aria-busy={isArchiving}
        disabled={isArchiving}
        onClick={handleArchive}
        type="button"
      >
        {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {isArchiving ? "Archiving..." : "Archive recipe"}
      </button>
    </main>
  );
}
