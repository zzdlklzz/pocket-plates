"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { BackLink } from "@/components/ui/back-link";
import { InlineNotice } from "@/components/ui/inline-notice";
import { RecipeCard } from "./recipe-card";
import { getRecipeErrorMessage } from "./recipe.errors";
import { useArchivedRecipeList, useRestoreRecipe } from "./recipe.queries";
import { ArchivedRecipeLibrarySkeleton } from "./recipe-skeletons";

export function ArchivedRecipeLibrary() {
  const { data: recipes = [], error, isLoading } = useArchivedRecipeList();
  const restoreRecipe = useRestoreRecipe();
  const pendingRecipeId = restoreRecipe.isPending ? restoreRecipe.variables : undefined;

  function handleRestore(id: string) {
    if (!restoreRecipe.isPending) {
      restoreRecipe.mutate(id);
    }
  }

  if (isLoading) {
    return <ArchivedRecipeLibrarySkeleton />;
  }

  return (
    <AppPageShell spacing="compact">
      <BackLink href="/">Library</BackLink>

      <header className="mt-5 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
        <h1 className="text-2xl font-bold text-slate-900">Archived recipes</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Restore a recipe to return it to your active library.
        </p>
      </header>

      <section className="mt-5" aria-label="Archived recipes">
        {error ? (
          <InlineNotice role="alert" tone="error">
            {getRecipeErrorMessage(error, "loadList")}
          </InlineNotice>
        ) : null}

        {restoreRecipe.error ? (
          <InlineNotice className="mb-4" role="alert" tone="error">
            {getRecipeErrorMessage(restoreRecipe.error, "restore")}
          </InlineNotice>
        ) : null}

        {!error && recipes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <h2 className="text-sm font-semibold text-slate-800">No archived recipes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Recipes you archive will appear here until you restore them.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-leaf-700" href="/">
              Return to library
            </Link>
          </div>
        ) : null}

        {recipes.length ? (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe) => {
              const isCurrentRestore = pendingRecipeId === recipe.id;

              return (
                <div className="flex flex-col gap-2" key={recipe.id}>
                  <RecipeCard recipe={recipe} />
                  <ActionButton
                    aria-label={`Restore ${recipe.title}`}
                    className="mt-auto"
                    disabled={restoreRecipe.isPending}
                    fullWidth
                    onClick={() => handleRestore(recipe.id)}
                    pending={isCurrentRestore}
                    pendingLabel="Restoring..."
                    variant="secondary"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restore
                  </ActionButton>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </AppPageShell>
  );
}
