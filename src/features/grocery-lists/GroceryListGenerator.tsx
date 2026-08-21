"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import {
  MAX_GROCERY_LIST_RECIPES,
  MAX_GROCERY_LIST_TARGET_SERVINGS,
  MAX_GROCERY_LIST_TITLE_LENGTH,
  MIN_GROCERY_LIST_TARGET_SERVINGS
} from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { validateGroceryListTitle } from "./grocery-list.validation";
import {
  useCreateGeneratedGroceryList,
  useGroceryListRecipeOptions,
  useSelectedRecipeGroceryPreview
} from "./grocery-list.queries";
import type {
  GroceryListRecipeOptionDto,
  SelectedGroceryListRecipeInput
} from "./grocery-list.types";
import { NewGroceryListSkeleton } from "./grocery-list-skeletons";
import { GroceryListSourceDisclosure } from "./GroceryListSourceDisclosure";

type SelectedRecipe = GroceryListRecipeOptionDto & {
  targetServings: string;
};

const subscribeToBrowser = () => () => {};

function defaultGroceryListTitle() {
  const date = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(new Date());
  return `Groceries · ${date}`;
}

function buildSelection(
  recipes: readonly SelectedRecipe[]
): SelectedGroceryListRecipeInput[] {
  return recipes.map((recipe, selectedRecipeOrder) => ({
    recipeId: recipe.id,
    selectedRecipeOrder,
    targetServings: Number(recipe.targetServings)
  }));
}

function getSelectionError(recipes: readonly SelectedRecipe[]) {
  if (recipes.length === 0) {
    return "Choose at least one recipe.";
  }

  const invalidRecipe = recipes.find((recipe) => {
    const targetServings = Number(recipe.targetServings);
    return (
      !/^\d+$/.test(recipe.targetServings) ||
      !Number.isInteger(targetServings) ||
      targetServings < MIN_GROCERY_LIST_TARGET_SERVINGS ||
      targetServings > MAX_GROCERY_LIST_TARGET_SERVINGS
    );
  });

  return invalidRecipe
    ? `Set ${invalidRecipe.title} to a whole number from ${MIN_GROCERY_LIST_TARGET_SERVINGS} to ${MAX_GROCERY_LIST_TARGET_SERVINGS} servings.`
    : null;
}

export function GroceryListGenerator() {
  const defaultTitle = useSyncExternalStore<string | null>(
    subscribeToBrowser,
    defaultGroceryListTitle,
    () => null
  );

  if (!defaultTitle) {
    return <NewGroceryListSkeleton />;
  }

  return <GroceryListGeneratorForm defaultTitle={defaultTitle} />;
}

function GroceryListGeneratorForm({ defaultTitle }: { defaultTitle: string }) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [search, setSearch] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([]);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const recipeOptions = useGroceryListRecipeOptions(search);
  const createList = useCreateGeneratedGroceryList();
  const selectedInputs = useMemo(
    () => buildSelection(selectedRecipes),
    [selectedRecipes]
  );
  const preview = useSelectedRecipeGroceryPreview(
    reviewRequested ? selectedInputs : []
  );
  const selectedIds = useMemo(
    () => new Set(selectedRecipes.map(({ id }) => id)),
    [selectedRecipes]
  );
  const isBusy = preview.isFetching || createList.isPending;

  function invalidateReview() {
    setReviewRequested(false);
    setValidationError(null);
    createList.reset();
  }

  function validate() {
    const titleResult = validateGroceryListTitle(title);
    if (titleResult.error || !titleResult.title) {
      setValidationError(titleResult.error);
      return null;
    }

    const selectionError = getSelectionError(selectedRecipes);
    if (selectionError) {
      setValidationError(selectionError);
      return null;
    }

    setValidationError(null);
    return { recipes: selectedInputs, title: titleResult.title };
  }

  function reviewItems() {
    if (!validate()) {
      return;
    }

    if (reviewRequested) {
      void preview.refetch();
    } else {
      setReviewRequested(true);
    }
  }

  async function createGroceryList() {
    const input = validate();
    if (
      !input ||
      !reviewRequested ||
      preview.isError ||
      preview.isFetching ||
      !preview.data?.length
    ) {
      return;
    }

    try {
      const id = await createList.mutateAsync(input);
      router.push(`/grocery-lists/${id}`);
    } catch {
      // The mutation error remains on the generator for a safe retry.
    }
  }

  return (
    <AppPageShell spacing="compact">
      <BackLink href="/grocery-lists">Grocery lists</BackLink>
      <header className="mt-6">
        <h1 className="text-3xl font-bold text-slate-900">Generate from recipes</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose recipes, adjust servings, then review the combined shopping items.
        </p>
      </header>

      <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        List title
        <input
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-leaf-500"
          disabled={createList.isPending}
          maxLength={MAX_GROCERY_LIST_TITLE_LENGTH}
          onChange={(event) => {
            setTitle(event.target.value);
            setValidationError(null);
            createList.reset();
          }}
          value={title}
        />
      </label>

      <section aria-labelledby="choose-recipes-heading" className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="choose-recipes-heading">
              Choose recipes
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {selectedRecipes.length} of {MAX_GROCERY_LIST_RECIPES} selected
            </p>
          </div>
        </div>

        <label className="relative mt-3 block">
          <span className="sr-only">Search recipes</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"
          />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-base text-slate-800 outline-none focus:border-leaf-500"
            disabled={isBusy}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or ingredient"
            ref={searchInputRef}
            type="search"
            value={search}
          />
        </label>

        <div
          aria-busy={recipeOptions.isPending || undefined}
          aria-label="Recipe search results"
          className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white"
        >
          {recipeOptions.isPending ? (
            <p className="p-4 text-sm text-slate-500">Loading recipes…</p>
          ) : recipeOptions.isError ? (
            <div className="p-4">
              <p className="text-sm text-red-700" role="alert">
                We could not load your recipes. Please try again.
              </p>
              <ActionButton
                className="mt-3"
                onClick={() => recipeOptions.refetch()}
                variant="secondary"
              >
                Try again
              </ActionButton>
            </div>
          ) : recipeOptions.data?.length ? (
            <ul className="divide-y divide-slate-200">
              {recipeOptions.data.map((recipe) => {
                const isSelected = selectedIds.has(recipe.id);
                const limitReached =
                  selectedRecipes.length >= MAX_GROCERY_LIST_RECIPES;
                return (
                  <li key={recipe.id}>
                    <button
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:text-slate-400"
                      disabled={isBusy || isSelected || limitReached}
                      onClick={() => {
                        setSelectedRecipes((current) => [
                          ...current,
                          {
                            ...recipe,
                            targetServings: String(recipe.savedServings)
                          }
                        ]);
                        setSearch("");
                        invalidateReview();
                        requestAnimationFrame(() => searchInputRef.current?.focus());
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">
                          {recipe.title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Serves {recipe.savedServings}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-leaf-700">
                        {isSelected ? "Selected" : limitReached ? "Limit reached" : "Add"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">
              {search.trim()
                ? "No recipes match this search."
                : "No active recipes are available yet."}
            </p>
          )}
        </div>
      </section>

      {selectedRecipes.length > 0 ? (
        <section aria-labelledby="selected-recipes-heading" className="mt-7">
          <h2 className="text-lg font-bold text-slate-900" id="selected-recipes-heading">
            Selected recipes
          </h2>
          <ul className="mt-3 space-y-3">
            {selectedRecipes.map((recipe) => (
              <li
                className="rounded-xl border border-slate-200 bg-white p-4"
                key={recipe.id}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{recipe.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Saved yield: {recipe.savedServings} servings
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${recipe.title}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-red-700"
                    disabled={isBusy}
                    onClick={() => {
                      setSelectedRecipes((current) =>
                        current.filter(({ id }) => id !== recipe.id)
                      );
                      invalidateReview();
                      requestAnimationFrame(() => searchInputRef.current?.focus());
                    }}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Target servings for {recipe.title}
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
                    disabled={isBusy}
                    inputMode="numeric"
                    max={MAX_GROCERY_LIST_TARGET_SERVINGS}
                    min={MIN_GROCERY_LIST_TARGET_SERVINGS}
                    onChange={(event) => {
                      const targetServings = event.target.value;
                      setSelectedRecipes((current) =>
                        current.map((currentRecipe) =>
                          currentRecipe.id === recipe.id
                            ? { ...currentRecipe, targetServings }
                            : currentRecipe
                        )
                      );
                      invalidateReview();
                    }}
                    step={1}
                    type="number"
                    value={recipe.targetServings}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {validationError ? (
        <InlineNotice className="mt-5" role="alert" tone="error">
          {validationError}
        </InlineNotice>
      ) : null}

      <ActionButton
        className="mt-6"
        disabled={selectedRecipes.length === 0 || createList.isPending}
        fullWidth
        onClick={reviewItems}
        pending={preview.isFetching}
        pendingLabel="Reviewing…"
        variant="secondary"
      >
        Review items
      </ActionButton>

      {reviewRequested && preview.isError ? (
        <InlineNotice className="mt-4" role="alert" tone="error">
          {getGroceryListErrorMessage(preview.error, "create")}
        </InlineNotice>
      ) : null}

      {reviewRequested && !preview.isError && !preview.isFetching && preview.data ? (
        <section aria-labelledby="preview-heading" className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900" id="preview-heading">
              Shopping items
            </h2>
            <p className="text-xs text-slate-500">
              {preview.data.length} item{preview.data.length === 1 ? "" : "s"}
            </p>
          </div>
          {preview.data.length > 0 ? (
            <>
              <ul className="mt-3 border-y border-slate-200">
                {preview.data.map((item) => (
                  <GroceryListSourceDisclosure item={item} key={item.normalizedName} />
                ))}
              </ul>
              {createList.isError ? (
                <InlineNotice className="mt-4" role="alert" tone="error">
                  {getGroceryListErrorMessage(createList.error, "create")}
                </InlineNotice>
              ) : null}
              <ActionButton
                className="mt-5"
                fullWidth
                onClick={createGroceryList}
                pending={createList.isPending}
                pendingLabel="Creating…"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create grocery list
              </ActionButton>
            </>
          ) : (
            <InlineNotice className="mt-3" tone="neutral">
              These recipes do not have any ingredients to add.
            </InlineNotice>
          )}
        </section>
      ) : null}
    </AppPageShell>
  );
}
