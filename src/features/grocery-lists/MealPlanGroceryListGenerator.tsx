"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import type { IsoDate } from "@/features/meal-planning/meal-planning.types";
import { MAX_GROCERY_LIST_TITLE_LENGTH } from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { validateGroceryListTitle } from "./grocery-list.validation";
import { formatGroceryListWeekRange } from "./grocery-list.week-formatting";
import {
  useCreateMealPlanGroceryList,
  useMealPlanGrocerySource
} from "./grocery-list.queries";
import { GroceryListSourceDisclosure } from "./GroceryListSourceDisclosure";

export function MealPlanGroceryListGenerator({
  weekStartDate
}: {
  weekStartDate: IsoDate;
}) {
  const router = useRouter();
  const weekRange = formatGroceryListWeekRange(weekStartDate)!;
  const [title, setTitle] = useState(`Groceries · ${weekRange}`);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [reviewError, setReviewError] = useState<unknown>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const sourceQuery = useMealPlanGrocerySource(weekStartDate);
  const createList = useCreateMealPlanGroceryList();

  async function reviewItems() {
    setValidationError(null);
    setReviewError(null);
    createList.reset();
    setReviewRequested(false);
    const result = await sourceQuery.refetch();
    if (!result.isError && result.data?.generatedItems.length) {
      setReviewRequested(true);
    } else if (result.isError) {
      setReviewError(result.error);
    }
  }

  async function createGroceryList() {
    const titleResult = validateGroceryListTitle(title);
    if (titleResult.error || !titleResult.title) {
      setValidationError(titleResult.error);
      return;
    }
    if (
      !reviewRequested ||
      reviewError ||
      sourceQuery.isFetching ||
      !sourceQuery.data?.generatedItems.length
    ) {
      return;
    }

    setValidationError(null);
    try {
      const id = await createList.mutateAsync({
        title: titleResult.title,
        weekStartDate
      });
      router.push(`/grocery-lists/${id}`);
    } catch {
      // The mutation error stays beside the preview for a safe retry.
    }
  }

  if (sourceQuery.isPending) {
    return (
      <AppPageShell spacing="compact">
        <div aria-label={`Loading grocery items for ${weekRange}`} role="status">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200" aria-hidden="true" />
          <div className="mt-5 h-24 animate-pulse rounded-xl bg-white" aria-hidden="true" />
          <div className="mt-3 h-36 animate-pulse rounded-xl bg-white" aria-hidden="true" />
        </div>
      </AppPageShell>
    );
  }

  if (!sourceQuery.data) {
    return (
      <MealPlanGeneratorUnavailable
        error={sourceQuery.isError ? sourceQuery.error : null}
        onRetry={() => void sourceQuery.refetch()}
        weekRange={weekRange}
        weekStartDate={weekStartDate}
      />
    );
  }

  const source = sourceQuery.data;
  if (source.recipes.length === 0 || source.generatedItems.length === 0) {
    return (
      <MealPlanGeneratorUnavailable
        weekRange={weekRange}
        weekStartDate={weekStartDate}
      />
    );
  }

  const showPreview =
    reviewRequested && !reviewError && !sourceQuery.isFetching;

  return (
    <AppPageShell spacing="compact">
      <BackLink href={`/meal-planner?week=${weekStartDate}`}>Meal planner</BackLink>
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">
          Meal plan · {weekRange}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Grocery list for this week
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review every planned recipe, then create one combined shopping list.
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

      <section aria-labelledby="planned-recipes-heading" className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900" id="planned-recipes-heading">
            Planned recipes
          </h2>
          <p className="text-xs text-slate-500">
            {source.recipes.length} recipe{source.recipes.length === 1 ? "" : "s"}
          </p>
        </div>
        <ul className="mt-3 space-y-3">
          {source.recipes.map((recipe) => (
            <li
              className="rounded-xl border border-slate-200 bg-white p-4"
              key={recipe.recipeId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{recipe.recipeTitle}</p>
                {recipe.archived ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    Archived
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Saved yield: {recipe.savedServings} · Planned: {recipe.plannedServings}
                {" · "}Scale {recipe.scaleLabel}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {validationError ? (
        <InlineNotice className="mt-5" role="alert" tone="error">
          {validationError}
        </InlineNotice>
      ) : null}

      <ActionButton
        className="mt-6"
        disabled={createList.isPending}
        fullWidth
        onClick={() => void reviewItems()}
        pending={sourceQuery.isFetching}
        pendingLabel="Reviewing…"
        variant="secondary"
      >
        Review items
      </ActionButton>

      {reviewError ? (
        <InlineNotice className="mt-4" role="alert" tone="error">
          {getGroceryListErrorMessage(reviewError, "create")}
        </InlineNotice>
      ) : null}

      {showPreview ? (
        <section aria-labelledby="meal-plan-preview-heading" className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2
              className="text-lg font-bold text-slate-900"
              id="meal-plan-preview-heading"
            >
              Shopping items
            </h2>
            <p className="text-xs text-slate-500">
              {source.generatedItems.length} item
              {source.generatedItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="mt-3 border-y border-slate-200">
            {source.generatedItems.map((item) => (
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
            onClick={() => void createGroceryList()}
            pending={createList.isPending}
            pendingLabel="Creating…"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create grocery list
          </ActionButton>
        </section>
      ) : null}
    </AppPageShell>
  );
}

function MealPlanGeneratorUnavailable({
  error,
  onRetry,
  weekRange,
  weekStartDate
}: {
  error?: unknown;
  onRetry?: () => void;
  weekRange: string;
  weekStartDate: IsoDate;
}) {
  return (
    <AppPageShell spacing="compact">
      <BackLink href={`/meal-planner?week=${weekStartDate}`}>Meal planner</BackLink>
      <section className="mt-8 rounded-2xl border border-leaf-100 bg-leaf-50 p-5 text-center">
        <h1 className="text-xl font-bold text-slate-900">
          No grocery list for {weekRange}
        </h1>
        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          role={error ? "alert" : undefined}
        >
          {error
            ? getGroceryListErrorMessage(error, "create")
            : "This week is empty or unavailable. Add meals in the planner, then try again."}
        </p>
        {onRetry ? (
          <ActionButton className="mt-4" onClick={onRetry} variant="secondary">
            Try again
          </ActionButton>
        ) : null}
        <Link
          className="mt-3 inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-leaf-700"
          href={`/meal-planner?week=${weekStartDate}`}
        >
          Back to meal planner
        </Link>
      </section>
    </AppPageShell>
  );
}
