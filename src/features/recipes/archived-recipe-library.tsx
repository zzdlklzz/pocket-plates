"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { InlineNotice } from "@/components/ui/inline-notice";
import { DeleteArchivedRecipesDialog } from "./delete-archived-recipes-dialog";
import { RecipeCard } from "./recipe-card";
import { getRecipeErrorMessage } from "./recipe.errors";
import { RecipeNavigation } from "./recipe-navigation";
import { useArchivedRecipeList, useDeleteArchivedRecipes, useRestoreRecipe } from "./recipe.queries";
import { ArchivedRecipeLibrarySkeleton } from "./recipe-skeletons";

export function ArchivedRecipeLibrary() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { data: recipes = [], error, isLoading } = useArchivedRecipeList();
  const deleteRecipes = useDeleteArchivedRecipes();
  const restoreRecipe = useRestoreRecipe();
  const pendingRecipeId = restoreRecipe.isPending ? restoreRecipe.variables : undefined;
  const selectedRecipes = useMemo(
    () => recipes.filter(({ id }) => selectedIds.has(id)),
    [recipes, selectedIds]
  );
  const allRecipesSelected = recipes.length > 0 && selectedRecipes.length === recipes.length;
  const isMutationPending = deleteRecipes.isPending || restoreRecipe.isPending;

  function handleRestore(id: string) {
    if (!isMutationPending) {
      restoreRecipe.mutate(id, {
        onSuccess: () => {
          setSelectedIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }
      });
    }
  }

  function toggleRecipeSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allRecipesSelected ? new Set() : new Set(recipes.map(({ id }) => id)));
  }

  function openDeleteDialog() {
    deleteRecipes.reset();
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (!deleteRecipes.isPending) {
      deleteRecipes.reset();
      setIsDeleteDialogOpen(false);
    }
  }

  async function confirmPermanentDeletion() {
    try {
      await deleteRecipes.mutateAsync(selectedRecipes.map(({ id }) => id));
      setSelectedIds(new Set());
      setIsDeleteDialogOpen(false);
    } catch {
      return;
    }
  }

  if (isLoading) {
    return <ArchivedRecipeLibrarySkeleton />;
  }

  return (
    <AppPageShell>
      <header className="rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
        <h1 className="text-2xl font-bold text-slate-900">Archived recipes</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Restore recipes to your library or select them for permanent deletion.
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
          </div>
        ) : null}

        {recipes.length ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                className="text-sm font-semibold text-leaf-700 disabled:text-slate-400"
                disabled={isMutationPending}
                onClick={toggleSelectAll}
                type="button"
              >
                {allRecipesSelected ? "Clear all" : "Select all"}
              </button>
              <ActionButton
                disabled={selectedRecipes.length === 0 || isMutationPending}
                onClick={openDeleteDialog}
                variant="danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete selected{selectedRecipes.length ? ` (${selectedRecipes.length})` : ""}
              </ActionButton>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {recipes.map((recipe) => {
                const isCurrentRestore = pendingRecipeId === recipe.id;
                const isSelected = selectedIds.has(recipe.id);

                return (
                  <div className="flex flex-col gap-2" key={recipe.id}>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        aria-label={`Select ${recipe.title}`}
                        checked={isSelected}
                        className="h-4 w-4 accent-leaf-700"
                        disabled={isMutationPending}
                        onChange={() => toggleRecipeSelection(recipe.id)}
                        type="checkbox"
                      />
                      Select
                    </label>
                    <RecipeCard recipe={recipe} />
                    <ActionButton
                      aria-label={`Restore ${recipe.title}`}
                      className="mt-auto"
                      disabled={isMutationPending}
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
          </>
        ) : null}
      </section>

      <RecipeNavigation activePage="archived" />

      {isDeleteDialogOpen ? (
        <DeleteArchivedRecipesDialog
          error={deleteRecipes.error}
          isPending={deleteRecipes.isPending}
          onCancel={closeDeleteDialog}
          onConfirm={confirmPermanentDeletion}
          recipeTitles={selectedRecipes.map(({ title }) => title)}
        />
      ) : null}
    </AppPageShell>
  );
}
