"use client";

import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RecipeNavigation } from "@/features/recipes/RecipeNavigation";
import { formatMealPlanDay, MealPlanDay } from "./MealPlanDay";
import { MealPlanEntrySheet } from "./MealPlanEntrySheet";
import { MealPlanPasteDialog } from "./MealPlanPasteDialog";
import {
  createDayCopyBuffer,
  createWeekCopyBuffer,
  mapMealPlanCopyBuffer,
  type MealPlanCopyBuffer,
  type MealPlanPasteInput
} from "./meal-planning.copy";
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
  useAddMealPlanEntries,
  useMealPlanRecipeOptions,
  useMealPlanWeek,
  usePreviewMealPlanEntries,
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
  copiedMealPlan: CopiedMealPlan | null;
  currentWeekStartDate: IsoDate;
  navigationFocus: WeekNavigationFocus | null;
  onCopy: (copy: CopiedMealPlan) => void;
  onNavigate: (weekStartDate: IsoDate, focus: WeekNavigationFocus) => void;
  today: IsoDate;
  weekStartDate: IsoDate;
};

type WeekNavigationFocus = "current" | "next" | "previous";

type RemovedMeal = {
  input: AddMealPlanEntryInput;
  recipeTitle: string;
};

type CopiedMealPlan = {
  buffer: MealPlanCopyBuffer;
  mealCount: number;
  sourceLabel: string;
};

type PasteRequest = {
  copyKind: MealPlanCopyBuffer["kind"];
  input: MealPlanPasteInput;
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

function getPlannerErrorMessage(action: "load" | "remove") {
  const messages = {
    load: "We could not load this week. Please try again.",
    remove: "We could not remove that meal. Please try again."
  };

  return messages[action];
}

export function MealPlanner({ requestedWeek }: { requestedWeek?: string }) {
  const router = useRouter();
  const [copiedMealPlan, setCopiedMealPlan] = useState<CopiedMealPlan | null>(null);
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
        copiedMealPlan={copiedMealPlan}
        currentWeekStartDate={currentWeekStartDate}
        key={weekStartDate}
        navigationFocus={
          pendingNavigation?.weekStartDate === weekStartDate
            ? pendingNavigation.focus
            : null
        }
        onCopy={setCopiedMealPlan}
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
  copiedMealPlan,
  currentWeekStartDate,
  navigationFocus,
  onCopy,
  onNavigate,
  today,
  weekStartDate
}: LocalWeek) {
  const weekDates = getWeekDates(weekStartDate);
  const weekQuery = useMealPlanWeek(weekStartDate);
  const [search, setSearch] = useState("");
  const recipeOptionsQuery = useMealPlanRecipeOptions(search);
  const addMutation = useAddMealPlanEntry();
  const pasteMutation = useAddMealPlanEntries();
  const previewPasteMutation = usePreviewMealPlanEntries();
  const restoreMutation = useRestoreMealPlanEntry();
  const removeMutation = useRemoveMealPlanEntry();
  const updateMutation = useUpdateMealPlanEntry();
  const [selectedDay, setSelectedDay] = useState<IsoDate | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntryDto | null>(null);
  const [removedMeal, setRemovedMeal] = useState<RemovedMeal | null>(null);
  const [pasteRequest, setPasteRequest] = useState<PasteRequest | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  const pasteTriggerRef = useRef<HTMLButtonElement>(null);
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
    closeEntrySheetWithFocus(
      dayAddButtonRefs.current.get(input.plannedFor) ?? sheetTriggerRef.current
    );
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

  function copyWeek() {
    if (!weekQuery.data) {
      return;
    }

    const buffer = createWeekCopyBuffer(weekQuery.data.entries, weekStartDate);
    if (buffer.entries.length === 0) {
      return;
    }

    onCopy({
      buffer,
      mealCount: buffer.entries.length,
      sourceLabel: formatWeekRange(weekStartDate)
    });
    setPasteFeedback(null);
  }

  function copyDay(date: IsoDate, entries: MealPlanEntryDto[]) {
    const buffer = createDayCopyBuffer(entries, date);
    if (buffer.entries.length === 0) {
      return;
    }

    const day = formatMealPlanDay(date);
    onCopy({
      buffer,
      mealCount: buffer.entries.length,
      sourceLabel: `${day.weekday}, ${day.dateLong}`
    });
    setPasteFeedback(null);
  }

  function openPastePreview(targetDate: IsoDate | undefined, trigger: HTMLButtonElement) {
    if (!copiedMealPlan) {
      return;
    }

    const input = {
      entries: mapMealPlanCopyBuffer(copiedMealPlan.buffer, {
        targetDate,
        weekStartDate
      }),
      weekStartDate
    };

    pasteTriggerRef.current = trigger;
    pasteMutation.reset();
    previewPasteMutation.reset();
    setPasteFeedback(null);
    setPasteRequest({ copyKind: copiedMealPlan.buffer.kind, input });
    previewPasteMutation.mutate(input);
  }

  function closePastePreview() {
    setPasteRequest(null);
    pasteMutation.reset();
    previewPasteMutation.reset();
  }

  function retryPastePreview() {
    if (!pasteRequest) {
      return;
    }

    pasteMutation.reset();
    previewPasteMutation.mutate(pasteRequest.input);
  }

  async function pasteMeals() {
    if (!pasteRequest) {
      return;
    }

    pasteMutation.reset();

    try {
      const result = await pasteMutation.mutateAsync(pasteRequest.input);
      const addedLabel = `${result.addedCount} meal${result.addedCount === 1 ? "" : "s"} added`;
      setPasteFeedback(
        `${addedLabel}. Skipped: ${result.exactDuplicateCount} duplicate${result.exactDuplicateCount === 1 ? "" : "s"}, ${result.archivedCount} archived, ${result.deletedCount} deleted or unavailable. Copied ${pasteRequest.copyKind} remains ready to paste again.`
      );
      closePastePreview();
    } catch {
      // The mutation error is rendered inside the paste preview.
    }
  }

  const firstMealDay = weekDates.includes(today) ? today : weekDates[0];
  const hasCopyableWeekEntries = Boolean(
    weekQuery.data?.entries.some((entry) => !entry.recipe.archived)
  );

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
            const day = formatMealPlanDay(date);
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

        {copiedMealPlan ? (
          <InlineNotice
            aria-live="polite"
            className="mt-4"
            role="status"
            tone="info"
          >
            {pasteFeedback ??
              `${copiedMealPlan.mealCount} meal${copiedMealPlan.mealCount === 1 ? "" : "s"} copied from ${copiedMealPlan.sourceLabel}.`}
          </InlineNotice>
        ) : null}

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
            {weekQuery.data.entries.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Week copy actions">
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                  disabled={!hasCopyableWeekEntries}
                  onClick={copyWeek}
                  type="button"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy week
                </button>
                {copiedMealPlan?.buffer.kind === "week" ? (
                  <button
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-leaf-300 bg-leaf-50 px-3 text-sm font-semibold text-leaf-700"
                    onClick={(event) => openPastePreview(undefined, event.currentTarget)}
                    ref={pasteTriggerRef}
                    type="button"
                  >
                    <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                    Paste week
                  </button>
                ) : null}
              </div>
            ) : null}

            {weekQuery.data.entries.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-leaf-100 bg-leaf-50 p-5 text-center">
                <CalendarPlus className="mx-auto h-7 w-7 text-leaf-700" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold text-slate-900">Plan your week</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add meals one day at a time from your saved recipes.
                </p>
                {copiedMealPlan?.buffer.kind === "week" ? (
                  <button
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white"
                    onClick={(event) => openPastePreview(undefined, event.currentTarget)}
                    ref={pasteTriggerRef}
                    type="button"
                  >
                    Paste copied week
                  </button>
                ) : null}
                <ActionButton
                  className={copiedMealPlan?.buffer.kind === "week" ? "mt-2" : "mt-4"}
                  onClick={(event) => openEntrySheet(firstMealDay, event.currentTarget)}
                  variant={copiedMealPlan?.buffer.kind === "week" ? "secondary" : "primary"}
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
              {weekDates.map((date) => {
                const entries = weekQuery.data.entries.filter(
                  (entry) => entry.plannedFor === date
                );

                return (
                  <MealPlanDay
                    canCopy={entries.some((entry) => !entry.recipe.archived)}
                    canPaste={copiedMealPlan?.buffer.kind === "day"}
                    date={date}
                    entries={entries}
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
                    onCopy={() => copyDay(date, entries)}
                    onEdit={openEditSheet}
                    onPaste={(trigger) => openPastePreview(date, trigger)}
                    onRemove={removeEntry}
                    onUndo={undoRemoval}
                    removedMeal={
                      removedMeal?.input.plannedFor === date ? removedMeal : null
                    }
                    restoreError={restoreMutation.error}
                    restoring={restoreMutation.isPending}
                  />
                );
              })}
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

      {pasteRequest ? (
        <MealPlanPasteDialog
          addCount={previewPasteMutation.data?.eligibleCount ?? 0}
          archivedCount={previewPasteMutation.data?.archivedCount ?? 0}
          copyKind={pasteRequest.copyKind}
          deletedCount={previewPasteMutation.data?.deletedCount ?? 0}
          duplicateCount={previewPasteMutation.data?.exactDuplicateCount ?? 0}
          error={pasteMutation.error}
          hasPreview={Boolean(previewPasteMutation.data)}
          isPending={pasteMutation.isPending}
          isPreviewPending={previewPasteMutation.isPending}
          onClose={closePastePreview}
          onConfirm={() => void pasteMeals()}
          onRetryPreview={retryPastePreview}
          previewError={previewPasteMutation.error}
          returnFocusRef={pasteTriggerRef}
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
