"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject
} from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { InlineNotice } from "@/components/ui/InlineNotice";
import {
  MAX_PLANNED_SERVINGS,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_VALUES
} from "./meal-planning.constants";
import { parseIsoDate } from "./meal-planning.dates";
import type {
  AddMealPlanEntryInput,
  IsoDate,
  MealPlanEntryDto,
  MealPlanRecipeOptionDto,
  MealPlanWeekDates,
  MealType
} from "./meal-planning.types";

type MealPlanEntrySheetProps = {
  error: unknown;
  entry?: MealPlanEntryDto;
  isPending: boolean;
  isRemovePending?: boolean;
  isRecipeOptionsLoading: boolean;
  onClose: () => void;
  onRemove?: () => Promise<void>;
  onRetryRecipeOptions: () => void;
  onSubmit: (input: AddMealPlanEntryInput) => Promise<void>;
  plannedFor: IsoDate;
  recipeOptions: MealPlanRecipeOptionDto[];
  recipeOptionsError: unknown;
  removeError?: unknown;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  search: string;
  setSearch: (search: string) => void;
  weekDates: MealPlanWeekDates;
  weekStartDate: IsoDate;
};

function formatSheetDate(date: IsoDate) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long"
  }).format(parseIsoDate(date) ?? undefined);
}

function getSaveErrorMessage(error: unknown, isEditing: boolean) {
  if (
    error instanceof Error &&
    [
      "This recipe is already planned for that meal.",
      "Choose an active recipe from your library."
    ].includes(error.message)
  ) {
    return error.message;
  }

  return isEditing
    ? "We could not save these changes. Please try again."
    : "We could not add this meal. Please try again.";
}

export function MealPlanEntrySheet({
  error,
  entry,
  isPending,
  isRemovePending = false,
  isRecipeOptionsLoading,
  onClose,
  onRemove,
  onRetryRecipeOptions,
  onSubmit,
  plannedFor,
  recipeOptions,
  recipeOptionsError,
  removeError,
  returnFocusRef,
  search,
  setSearch,
  weekDates,
  weekStartDate
}: MealPlanEntrySheetProps) {
  const isEditing = Boolean(entry);
  const isBusy = isPending || isRemovePending;
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(isBusy);
  const onCloseRef = useRef(onClose);
  const [selectedDate, setSelectedDate] = useState(entry?.plannedFor ?? plannedFor);
  const [recipeId, setRecipeId] = useState(entry?.recipe.id ?? "");
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? "flexible");
  const [servings, setServings] = useState(String(entry?.servings ?? 1));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    isPendingRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocus?.focus();
    };
  }, [returnFocusRef]);

  function selectRecipe(nextRecipeId: string) {
    const recipe = recipeOptions.find(({ id }) => id === nextRecipeId);

    setRecipeId(nextRecipeId);
    setValidationError(null);

    if (recipe) {
      setMealType(recipe.mealTypes.length === 1 ? recipe.mealTypes[0] : "flexible");
      setServings(String(recipe.servings));
      setSearch("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plannedServings = Number(servings);

    if (!recipeId) {
      setValidationError("Choose a recipe.");
      return;
    }

    if (
      !Number.isInteger(plannedServings) ||
      plannedServings < 1 ||
      plannedServings > MAX_PLANNED_SERVINGS
    ) {
      setValidationError(
        `Servings must be a whole number from 1 to ${MAX_PLANNED_SERVINGS}.`
      );
      return;
    }

    setValidationError(null);
    try {
      await onSubmit({
        mealType,
        plannedFor: selectedDate,
        recipeId,
        servings: plannedServings,
        weekStartDate
      });
    } catch {
      // The mutation error is rendered above the submit button.
    }
  }

  const dayName = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    parseIsoDate(selectedDate) ?? undefined
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={isEditing ? "Edit meal" : "Add meal"}
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        ref={dialogRef}
        role="dialog"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Edit meal" : "Add meal"}
          </h2>
          <button
            aria-label={isEditing ? "Close edit meal" : "Close add meal"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            disabled={isBusy}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-4 min-h-0 overflow-y-auto" onSubmit={submit}>
          {isEditing ? (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Day
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800"
                  disabled={isBusy}
                  onChange={(event) => setSelectedDate(event.target.value as IsoDate)}
                  value={selectedDate}
                >
                  {weekDates.map((date) => (
                    <option key={date} value={date}>
                      {formatSheetDate(date)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recipe
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 normal-case tracking-normal">
                  <p className="text-sm font-semibold text-slate-800">{entry?.recipe.title}</p>
                  {entry?.recipe.archived ? (
                    <p className="mt-1 text-xs font-medium text-slate-500">Archived recipe</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Day
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 text-sm text-slate-700"
                  disabled
                  value={formatSheetDate(selectedDate)}
                />
              </label>

              <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search recipes
                <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 py-3 text-sm text-slate-800 outline-none"
                    disabled={isBusy}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Title or ingredient"
                    type="search"
                    value={search}
                  />
                </span>
              </label>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recipe
                <select
                  aria-label="Recipe"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800"
                  disabled={isBusy || isRecipeOptionsLoading || Boolean(recipeOptionsError)}
                  onChange={(event) => selectRecipe(event.target.value)}
                  value={recipeId}
                >
                  <option value="">
                    {isRecipeOptionsLoading ? "Loading recipes..." : "Choose a recipe"}
                  </option>
                  {recipeOptions.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {!isEditing && recipeOptionsError ? (
            <InlineNotice className="mt-3 flex items-center justify-between gap-3" role="alert" tone="error">
              <span>We could not load your recipes.</span>
              <button
                className="shrink-0 font-semibold underline disabled:text-slate-400"
                disabled={isRecipeOptionsLoading}
                onClick={onRetryRecipeOptions}
                type="button"
              >
                Try again
              </button>
            </InlineNotice>
          ) : !isEditing && !isRecipeOptionsLoading && recipeOptions.length === 0 ? (
            <InlineNotice className="mt-3" tone="info">
              {search ? (
                "No active recipes match that search."
              ) : (
                <>
                  No active recipes yet. <Link className="font-semibold text-leaf-700 underline" href="/recipes/new">Add a recipe</Link> first.
                </>
              )}
            </InlineNotice>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meal
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800"
                disabled={isBusy}
                onChange={(event) => setMealType(event.target.value as MealType)}
                value={mealType}
              >
                {MEAL_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {MEAL_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Servings
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800"
                disabled={isBusy}
                inputMode="numeric"
                max={MAX_PLANNED_SERVINGS}
                min={1}
                onChange={(event) => setServings(event.target.value)}
                type="number"
                value={servings}
              />
            </label>
          </div>

          {validationError || error ? (
            <InlineNotice className="mt-4" role="alert" tone="error">
              {validationError ?? getSaveErrorMessage(error, isEditing)}
            </InlineNotice>
          ) : null}

          {removeError ? (
            <InlineNotice className="mt-4" role="alert" tone="error">
              We could not remove this meal. Please try again.
            </InlineNotice>
          ) : null}

          <ActionButton
            className="mt-5"
            disabled={isRemovePending}
            fullWidth
            pending={isPending}
            pendingLabel={isEditing ? "Saving changes..." : "Adding meal..."}
            type="submit"
          >
            {isEditing ? "Save changes" : `Add to ${dayName}`}
          </ActionButton>

          {isEditing && onRemove ? (
            <ActionButton
              className="mt-3"
              disabled={isPending}
              fullWidth
              onClick={() => void onRemove()}
              pending={isRemovePending}
              pendingLabel="Removing meal..."
              variant="danger"
            >
              Remove meal
            </ActionButton>
          ) : null}
        </form>
      </section>
    </div>
  );
}
