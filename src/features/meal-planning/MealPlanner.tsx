"use client";

import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RecipeNavigation } from "@/features/recipes/RecipeNavigation";
import { MealPlanEntrySheet } from "./MealPlanEntrySheet";
import { MEAL_TYPE_LABELS } from "./meal-planning.constants";
import {
  formatIsoDate,
  getNextWeekStart,
  getPreviousWeekStart,
  getWeekDates,
  getWeekStart,
  normalizeWeekStart,
  parseIsoDate
} from "./meal-planning.dates";
import {
  useAddMealPlanEntry,
  useMealPlanRecipeOptions,
  useMealPlanWeek,
  useRemoveMealPlanEntry,
  useRestoreMealPlanEntry,
  useUpdateMealPlanEntry
} from "./meal-planning.queries";
import type {
  AddMealPlanEntryInput,
  IsoDate,
  MealPlanEntryDto
} from "./meal-planning.types";

type LocalWeek = {
  currentWeekStartDate: IsoDate;
  navigationFocus: WeekNavigationFocus | null;
  onNavigate: (weekStartDate: IsoDate, focus: WeekNavigationFocus) => void;
  today: IsoDate;
  weekStartDate: IsoDate;
};

type WeekNavigationFocus = "current" | "next" | "previous";

type RemovedMeal = {
  input: AddMealPlanEntryInput;
  recipeTitle: string;
};

const subscribeToBrowser = () => () => {};

function formatWeekRange(weekStartDate: IsoDate) {
  const dates = getWeekDates(weekStartDate);
  const start = parseIsoDate(dates[0])!;
  const end = parseIsoDate(dates[6])!;
  const monthYear = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  });

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.getDate()}–${end.getDate()} ${monthYear.format(end)}`;
  }

  const startFormatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric"
  });
  const endFormatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return `${startFormatter.format(start)}–${endFormatter.format(end)}`;
}

function formatDay(date: IsoDate) {
  const parsedDate = parseIsoDate(date)!;

  return {
    date: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short"
    }).format(parsedDate),
    dateLong: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "long"
    }).format(parsedDate),
    dayNumber: parsedDate.getDate(),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
      parsedDate
    ),
    weekdayShort: new Intl.DateTimeFormat(undefined, { weekday: "short" })
      .format(parsedDate)
      .toUpperCase()
  };
}

function getPlannerErrorMessage(action: "load" | "remove" | "undo") {
  const messages = {
    load: "We could not load this week. Please try again.",
    remove: "We could not remove that meal. Please try again.",
    undo: "We could not restore that meal. Please try again."
  };

  return messages[action];
}

export function MealPlanner({ requestedWeek }: { requestedWeek?: string }) {
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<{
    focus: WeekNavigationFocus;
    weekStartDate: IsoDate;
  } | null>(null);
  const today = useSyncExternalStore<IsoDate | null>(
    subscribeToBrowser,
    () => formatIsoDate(new Date()),
    () => null
  );
  const todayDate = today ? parseIsoDate(today) : null;
  const currentWeekStartDate = todayDate ? getWeekStart(todayDate) : null;
  const weekStartDate = todayDate
    ? normalizeWeekStart(requestedWeek ?? currentWeekStartDate!, todayDate)
    : null;

  useEffect(() => {
    if (weekStartDate && requestedWeek !== weekStartDate) {
      router.replace(`/meal-planner?week=${weekStartDate}`, { scroll: false });
    }
  }, [requestedWeek, router, weekStartDate]);

  if (!today || !currentWeekStartDate || !weekStartDate) {
    return <MealPlannerInitialLoading />;
  }

  return (
    <>
      <p
        aria-label={`Week range: ${formatWeekRange(weekStartDate)}`}
        aria-live="polite"
        className="sr-only"
      >
        Viewing week {formatWeekRange(weekStartDate)}
      </p>
      <CurrentWeekPlanner
        currentWeekStartDate={currentWeekStartDate}
        key={weekStartDate}
        navigationFocus={
          pendingNavigation?.weekStartDate === weekStartDate
            ? pendingNavigation.focus
            : null
        }
        onNavigate={(nextWeek, focus) => {
          setPendingNavigation({ focus, weekStartDate: nextWeek });
          router.push(`/meal-planner?week=${nextWeek}`, { scroll: false });
        }}
        today={today}
        weekStartDate={weekStartDate}
      />
    </>
  );
}

function MealPlannerInitialLoading() {
  return (
    <AppPageShell>
      <div aria-label="Loading meal planner" role="status">
        <div className="h-8 w-40 animate-pulse rounded-md bg-leaf-100" aria-hidden="true" />
        <div className="mt-3 h-4 w-36 animate-pulse rounded-md bg-slate-200" aria-hidden="true" />
      </div>
    </AppPageShell>
  );
}

function CurrentWeekPlanner({
  currentWeekStartDate,
  navigationFocus,
  onNavigate,
  today,
  weekStartDate
}: LocalWeek) {
  const weekDates = getWeekDates(weekStartDate);
  const weekQuery = useMealPlanWeek(weekStartDate);
  const [search, setSearch] = useState("");
  const recipeOptionsQuery = useMealPlanRecipeOptions(search);
  const addMutation = useAddMealPlanEntry();
  const restoreMutation = useRestoreMealPlanEntry();
  const removeMutation = useRemoveMealPlanEntry();
  const updateMutation = useUpdateMealPlanEntry();
  const [selectedDay, setSelectedDay] = useState<IsoDate | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntryDto | null>(null);
  const [removedMeal, setRemovedMeal] = useState<RemovedMeal | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  const dayAddButtonRefs = useRef(new Map<IsoDate, HTMLButtonElement>());
  const previousWeekRef = useRef<HTMLButtonElement>(null);
  const currentWeekRef = useRef<HTMLButtonElement>(null);
  const nextWeekRef = useRef<HTMLButtonElement>(null);

  function closeEntrySheetWithFocus(focusTarget: HTMLButtonElement | undefined | null) {
    setSelectedDay(null);
    setSelectedEntry(null);
    setSearch("");
    addMutation.reset();
    removeMutation.reset();
    updateMutation.reset();
    queueMicrotask(() => focusTarget?.focus());
  }

  function closeEntrySheet() {
    closeEntrySheetWithFocus(sheetTriggerRef.current);
  }

  useEffect(() => {
    if (!navigationFocus) {
      return;
    }

    const navigationRefs: Record<WeekNavigationFocus, typeof previousWeekRef> = {
      current: currentWeekRef,
      next: nextWeekRef,
      previous: previousWeekRef
    };

    navigationRefs[navigationFocus].current?.focus();
  }, [navigationFocus, weekStartDate]);

  useEffect(() => {
    if (!removedMeal || restoreMutation.isPending) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRemovedMeal((current) => (current === removedMeal ? null : current));
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [removedMeal, restoreMutation.isPending]);

  function openEntrySheet(day: IsoDate, trigger: HTMLButtonElement) {
    sheetTriggerRef.current = trigger;
    addMutation.reset();
    updateMutation.reset();
    setSearch("");
    setSelectedEntry(null);
    setSelectedDay(day);
  }

  function openEditSheet(entry: MealPlanEntryDto, trigger: HTMLButtonElement) {
    sheetTriggerRef.current = trigger;
    removeMutation.reset();
    updateMutation.reset();
    setSearch("");
    setSelectedDay(entry.plannedFor);
    setSelectedEntry(entry);
  }

  async function addEntry(input: AddMealPlanEntryInput) {
    await addMutation.mutateAsync(input);
    closeEntrySheet();
  }

  async function updateEntry(input: AddMealPlanEntryInput) {
    if (!selectedEntry) {
      return;
    }

    await updateMutation.mutateAsync({
      entryId: selectedEntry.id,
      mealType: input.mealType,
      plannedFor: input.plannedFor,
      servings: input.servings,
      weekStartDate
    });
    closeEntrySheetWithFocus(
      input.plannedFor === selectedEntry.plannedFor
        ? sheetTriggerRef.current
        : dayAddButtonRefs.current.get(input.plannedFor)
    );
  }

  async function removeEntry(entry: MealPlanEntryDto) {
    removeMutation.reset();
    restoreMutation.reset();

    try {
      const input = await removeMutation.mutateAsync({
        entryId: entry.id,
        weekStartDate
      });
      setRemovedMeal({ input, recipeTitle: entry.recipe.title });
      if (selectedEntry?.id === entry.id) {
        closeEntrySheetWithFocus(dayAddButtonRefs.current.get(entry.plannedFor));
      } else {
        queueMicrotask(() =>
          dayAddButtonRefs.current.get(entry.plannedFor)?.focus()
        );
      }
    } catch {
      // The mutation error is rendered below the week header.
    }
  }

  async function undoRemoval() {
    if (!removedMeal) {
      return;
    }

    restoreMutation.reset();

    try {
      await restoreMutation.mutateAsync(removedMeal.input);
      setRemovedMeal(null);
    } catch {
      // The mutation error is rendered beside the Undo action.
    }
  }

  const firstMealDay = weekDates.includes(today) ? today : weekDates[0];

  return (
    <>
      <AppPageShell>
        <header>
          <p className="text-sm font-semibold text-leaf-700">PocketPlates</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Meal planner</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatWeekRange(weekStartDate)}
          </p>
          <div className="mt-4 grid grid-cols-[2.75rem_1fr_2.75rem] gap-2">
            <button
              aria-label="Previous week"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
              onClick={() =>
                onNavigate(getPreviousWeekStart(weekStartDate), "previous")
              }
              ref={previousWeekRef}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              aria-current={weekStartDate === currentWeekStartDate ? "date" : undefined}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              onClick={() => onNavigate(currentWeekStartDate, "current")}
              ref={currentWeekRef}
              type="button"
            >
              This week
            </button>
            <button
              aria-label="Next week"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
              onClick={() => onNavigate(getNextWeekStart(weekStartDate), "next")}
              ref={nextWeekRef}
              type="button"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <ol
          aria-label="Days in this week"
          className="mt-5 grid grid-cols-7 gap-1 rounded-xl border border-slate-200 bg-white p-2"
        >
          {weekDates.map((date) => {
            const day = formatDay(date);
            const isToday = date === today;

            return (
              <li
                aria-current={isToday ? "date" : undefined}
                className={
                  isToday
                    ? "rounded-lg bg-leaf-700 px-1 py-2 text-center text-white"
                    : "px-1 py-2 text-center text-slate-600"
                }
                key={date}
              >
                <span className="block text-[0.65rem] font-bold">{day.weekdayShort}</span>
                <span className="mt-1 block text-sm font-semibold">{day.dayNumber}</span>
              </li>
            );
          })}
        </ol>

        {weekQuery.isPending ? (
          <AgendaLoading weekRange={formatWeekRange(weekStartDate)} />
        ) : weekQuery.isError ? (
          <section className="mt-6" aria-label="Meal planner error">
            <InlineNotice role="alert" tone="error">
              {getPlannerErrorMessage("load")}
            </InlineNotice>
            <ActionButton
              className="mt-3"
              onClick={() => weekQuery.refetch()}
              variant="secondary"
            >
              Try again
            </ActionButton>
          </section>
        ) : (
          <>
            {weekQuery.data.entries.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-leaf-100 bg-leaf-50 p-5 text-center">
                <CalendarPlus className="mx-auto h-7 w-7 text-leaf-700" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold text-slate-900">Plan your week</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add meals one day at a time from your saved recipes.
                </p>
                <ActionButton
                  className="mt-4"
                  onClick={(event) => openEntrySheet(firstMealDay, event.currentTarget)}
                >
                  Add your first meal
                </ActionButton>
              </section>
            ) : null}

            {removeMutation.error && !selectedEntry ? (
              <InlineNotice className="mt-5" role="alert" tone="error">
                {getPlannerErrorMessage("remove")}
              </InlineNotice>
            ) : null}

            <div className="mt-6 divide-y divide-slate-200">
              {weekDates.map((date) => (
                <MealPlanDay
                  date={date}
                  entries={weekQuery.data.entries.filter(
                    (entry) => entry.plannedFor === date
                  )}
                  isRemoving={
                    removeMutation.isPending &&
                    removeMutation.variables?.entryId !== undefined
                  }
                  isToday={date === today}
                  key={date}
                  onAdd={openEntrySheet}
                  onAddButtonChange={(button) => {
                    if (button) {
                      dayAddButtonRefs.current.set(date, button);
                    } else {
                      dayAddButtonRefs.current.delete(date);
                    }
                  }}
                  onEdit={openEditSheet}
                  onRemove={removeEntry}
                  onUndo={undoRemoval}
                  removedMeal={
                    removedMeal?.input.plannedFor === date ? removedMeal : null
                  }
                  restoreError={restoreMutation.error}
                  restoring={restoreMutation.isPending}
                />
              ))}
            </div>
          </>
        )}
      </AppPageShell>

      <RecipeNavigation activePage="meal-planner" />

      {selectedDay ? (
        <MealPlanEntrySheet
          entry={selectedEntry ?? undefined}
          error={selectedEntry ? updateMutation.error : addMutation.error}
          isPending={selectedEntry ? updateMutation.isPending : addMutation.isPending}
          isRemovePending={removeMutation.isPending}
          isRecipeOptionsLoading={recipeOptionsQuery.isPending}
          key={selectedEntry?.id ?? selectedDay}
          onClose={closeEntrySheet}
          onRemove={selectedEntry ? () => removeEntry(selectedEntry) : undefined}
          onRetryRecipeOptions={() => void recipeOptionsQuery.refetch()}
          onSubmit={selectedEntry ? updateEntry : addEntry}
          plannedFor={selectedDay}
          recipeOptions={recipeOptionsQuery.data ?? []}
          recipeOptionsError={recipeOptionsQuery.error}
          removeError={selectedEntry ? removeMutation.error : null}
          returnFocusRef={sheetTriggerRef}
          search={search}
          setSearch={setSearch}
          weekDates={weekDates}
          weekStartDate={weekStartDate}
        />
      ) : null}
    </>
  );
}

function AgendaLoading({ weekRange }: { weekRange: string }) {
  return (
    <div
      aria-label={`Loading meals for ${weekRange}`}
      aria-live="polite"
      className="mt-6 space-y-6"
      role="status"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <section key={index}>
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200" aria-hidden="true" />
          <div className="mt-3 h-14 animate-pulse rounded-lg bg-white" aria-hidden="true" />
          <div className="mt-2 h-11 animate-pulse rounded-lg bg-leaf-50" aria-hidden="true" />
        </section>
      ))}
    </div>
  );
}

type MealPlanDayProps = {
  date: IsoDate;
  entries: MealPlanEntryDto[];
  isRemoving: boolean;
  isToday: boolean;
  onAdd: (day: IsoDate, trigger: HTMLButtonElement) => void;
  onAddButtonChange: (button: HTMLButtonElement | null) => void;
  onEdit: (entry: MealPlanEntryDto, trigger: HTMLButtonElement) => void;
  onRemove: (entry: MealPlanEntryDto) => Promise<void>;
  onUndo: () => Promise<void>;
  removedMeal: RemovedMeal | null;
  restoreError: unknown;
  restoring: boolean;
};

function MealPlanDay({
  date,
  entries,
  isRemoving,
  isToday,
  onAdd,
  onAddButtonChange,
  onEdit,
  onRemove,
  onUndo,
  removedMeal,
  restoreError,
  restoring
}: MealPlanDayProps) {
  const day = formatDay(date);

  return (
    <section
      aria-label={`${day.weekday} ${day.dateLong}`}
      className="py-5 first:pt-0"
    >
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-bold text-slate-900">{day.weekday}</h2>
        <p className="text-xs text-slate-500">
          {day.date}{isToday ? " · Today" : ""}
        </p>
      </div>

      {entries.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              key={entry.id}
            >
              <button
                aria-label={`Edit ${entry.recipe.title} on ${day.weekday}`}
                className="min-w-0 flex-1 text-left"
                onClick={(event) => onEdit(entry, event.currentTarget)}
                type="button"
              >
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-leaf-700">
                  {MEAL_TYPE_LABELS[entry.mealType]}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {entry.recipe.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.servings} serving{entry.servings === 1 ? "" : "s"}
                  {entry.recipe.archived ? " · Archived recipe" : ""}
                </p>
              </button>
              {!entry.recipe.archived ? (
                <Link
                  aria-label={`View ${entry.recipe.title} recipe`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                  href={`/recipes/${entry.recipe.id}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
              <button
                aria-label={`Remove ${entry.recipe.title} from ${day.weekday}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 disabled:text-slate-400"
                disabled={isRemoving || restoring}
                onClick={() => onRemove(entry)}
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Nothing planned yet</p>
      )}

      {removedMeal ? (
        <InlineNotice
          aria-live="polite"
          className="mt-3 flex items-center justify-between gap-3"
          role="status"
          tone="neutral"
        >
          <span>{removedMeal.recipeTitle} removed</span>
          <button
            className="font-semibold text-leaf-700 disabled:text-slate-400"
            disabled={restoring}
            onClick={onUndo}
            type="button"
          >
            {restoring ? "Restoring..." : "Undo"}
          </button>
        </InlineNotice>
      ) : null}

      {removedMeal && restoreError ? (
        <InlineNotice className="mt-2" role="alert" tone="error">
          {getPlannerErrorMessage("undo")}
        </InlineNotice>
      ) : null}

      <button
        aria-label={`Add meal to ${day.weekday}, ${day.dateLong}`}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-leaf-300 bg-leaf-50 px-4 py-2 text-sm font-semibold text-leaf-700"
        onClick={(event) => onAdd(date, event.currentTarget)}
        ref={onAddButtonChange}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add meal
      </button>
    </section>
  );
}
