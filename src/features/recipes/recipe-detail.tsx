"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTransition } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { BackLink } from "@/components/ui/back-link";
import { InlineNotice } from "@/components/ui/inline-notice";
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
      <AppPageShell spacing="compact">
        <BackLink href="/">Back</BackLink>
        <InlineNotice className="mt-5" tone="neutral">
          {error ? getRecipeErrorMessage(error, "loadDetail") : "We could not find this recipe."}
        </InlineNotice>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <div className="flex items-center justify-between">
        <BackLink href="/">Library</BackLink>
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
        {recipe.sourceLinks.length ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {recipe.sourceLinks.map((source, index) => (
              <a
                className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700"
                href={source.url}
                key={`${source.url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                {source.label || `Source ${index + 1}`}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}
      </section>

      {recipe.notes ? (
        <RecipeDetailSection title="Notes">
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{recipe.notes}</p>
        </RecipeDetailSection>
      ) : null}

      <RecipeDetailSection title="Ingredients">
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
      </RecipeDetailSection>

      <RecipeDetailSection title="Steps">
        <ol className="mt-3 space-y-3 text-sm text-slate-600">
          {recipe.steps.map((step, index) => (
            <li className="flex gap-3" key={`${step.instruction}-${index}`}>
              <span className="font-semibold text-leaf-700">{index + 1}</span>
              <span>{step.instruction}</span>
            </li>
          ))}
        </ol>
      </RecipeDetailSection>

      {archiveRecipe.error ? (
        <InlineNotice className="mt-5" padding="compact" tone="error">
          {getRecipeErrorMessage(archiveRecipe.error, "archive")}
        </InlineNotice>
      ) : null}

      <ActionButton
        className="mt-5"
        fullWidth
        onClick={handleArchive}
        pending={isArchiving}
        pendingLabel="Archiving..."
        variant="danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Archive recipe
      </ActionButton>
    </AppPageShell>
  );
}

function RecipeDetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
