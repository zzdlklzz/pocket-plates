"use client";

import {
  ChevronDown,
  Ellipsis,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState
} from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RecipeNavigation } from "@/features/recipes/RecipeNavigation";
import { DeleteGroceryListDialog } from "./DeleteGroceryListDialog";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { formatSelectedRecipeSource } from "./grocery-list.source-formatting";
import { formatGroceryListWeekRange } from "./grocery-list.week-formatting";
import {
  useAddGroceryListItem,
  useDeleteGroceryList,
  useGroceryListDetail,
  useRemoveGroceryListItem,
  useRenameGroceryList,
  useResetGroceryListChecklist,
  useRefreshGroceryListFromWeek,
  useSetGroceryListItemChecked,
  useUpdateGroceryListItem
} from "./grocery-list.queries";
import { GroceryListDetailSkeleton } from "./grocery-list-skeletons";
import type { GroceryListItemDto } from "./grocery-list.types";
import {
  GroceryListItemSheet,
  type GroceryListItemFormValues
} from "./GroceryListItemSheet";
import { GroceryListItemRow } from "./GroceryListItemRow";
import { RenameGroceryListDialog } from "./RenameGroceryListDialog";

function getSourceLabel({
  mealPlanAvailable,
  sourceRecipeCount,
  sourceType,
  sourceWeekStartDate
}: {
  mealPlanAvailable: boolean;
  sourceRecipeCount: number;
  sourceType: "manual" | "meal_plan" | "recipes";
  sourceWeekStartDate: string | null;
}) {
  if (sourceType === "manual") {
    return "Manual list";
  }
  if (sourceType === "recipes") {
    return formatSelectedRecipeSource(sourceRecipeCount);
  }

  const weekRange = formatGroceryListWeekRange(sourceWeekStartDate);
  return mealPlanAvailable
    ? `Meal plan${weekRange ? ` · ${weekRange}` : ""}`
    : `Week unavailable${weekRange ? ` · ${weekRange}` : ""}`;
}

export function GroceryListDetail({ id }: { id: string }) {
  const router = useRouter();
  const listQuery = useGroceryListDetail(id);
  const addItem = useAddGroceryListItem();
  const updateItem = useUpdateGroceryListItem();
  const checkItem = useSetGroceryListItemChecked();
  const removeItem = useRemoveGroceryListItem();
  const renameList = useRenameGroceryList();
  const resetChecklist = useResetGroceryListChecklist();
  const deleteList = useDeleteGroceryList();
  const refreshFromWeek = useRefreshGroceryListFromWeek();
  const [selectedItem, setSelectedItem] = useState<GroceryListItemDto | "new" | null>(null);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<unknown>(null);
  const [pendingCheckItemIds, setPendingCheckItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const sheetTriggerRef = useRef<HTMLButtonElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const actionsPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActionsOpen) {
      return;
    }

    function closeActionsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsActionsOpen(false);
        actionsTriggerRef.current?.focus();
      }
    }

    function closeActionsFromOutside(event: MouseEvent) {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        actionsPopoverRef.current?.contains(target) ||
        actionsTriggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsActionsOpen(false);
    }

    document.addEventListener("keydown", closeActionsOnEscape);
    document.addEventListener("mousedown", closeActionsFromOutside);
    return () => {
      document.removeEventListener("keydown", closeActionsOnEscape);
      document.removeEventListener("mousedown", closeActionsFromOutside);
    };
  }, [isActionsOpen]);

  if (listQuery.isPending) {
    return <GroceryListDetailSkeleton />;
  }

  if (listQuery.isError || !listQuery.data) {
    return (
      <>
        <AppPageShell spacing="compact">
          <BackLink href="/grocery-lists">Grocery lists</BackLink>
          <InlineNotice className="mt-5" tone="neutral">
            {listQuery.isError
              ? getGroceryListErrorMessage(listQuery.error, "loadDetail")
              : "We could not find this grocery list."}
          </InlineNotice>
        </AppPageShell>
        <RecipeNavigation activePage="grocery-lists" />
      </>
    );
  }

  const list = listQuery.data;
  const toBuy = list.items.filter((item) => !item.checked);
  const completed = list.items.filter((item) => item.checked);

  function openNewItem(trigger: HTMLButtonElement) {
    sheetTriggerRef.current = trigger;
    addItem.reset();
    setSelectedItem("new");
  }

  function openItem(item: GroceryListItemDto, trigger: HTMLButtonElement) {
    sheetTriggerRef.current = trigger;
    updateItem.reset();
    removeItem.reset();
    setSelectedItem(item);
  }

  function closeItemSheet() {
    setSelectedItem(null);
    addItem.reset();
    updateItem.reset();
    removeItem.reset();
  }

  async function saveItem(
    values: GroceryListItemFormValues,
    quantityOverridden: boolean
  ) {
    if (selectedItem === "new") {
      await addItem.mutateAsync({ groceryListId: id, values });
      setFeedback(`${values.name} added.`);
    } else if (selectedItem) {
      await updateItem.mutateAsync({
        groceryListId: id,
        itemId: selectedItem.id,
        quantityOverridden,
        values
      });
      setFeedback(`${values.name} updated.`);
    }
    closeItemSheet();
  }

  async function removeSelectedItem() {
    if (!selectedItem || selectedItem === "new") {
      return;
    }

    const name = selectedItem.name;
    await removeItem.mutateAsync({ groceryListId: id, itemId: selectedItem.id });
    closeItemSheet();
    setFeedback(`${name} removed.`);
  }

  async function setChecked(item: GroceryListItemDto, checked: boolean) {
    checkItem.reset();
    setCheckError(null);
    setPendingCheckItemIds((current) => new Set(current).add(item.id));
    try {
      await checkItem.mutateAsync({ checked, groceryListId: id, itemId: item.id });
      setFeedback(
        checked
          ? `${item.name} moved to Completed.`
          : `${item.name} moved to To buy.`
      );
    } catch (error) {
      setCheckError(error);
    } finally {
      setPendingCheckItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function rename(title: string) {
    await renameList.mutateAsync({ groceryListId: id, title });
    setIsRenameOpen(false);
    setFeedback("List renamed.");
  }

  async function resetChecklistItems() {
    resetChecklist.reset();
    setFeedback("Resetting checklist…");
    setIsActionsOpen(false);
    actionsTriggerRef.current?.focus();

    try {
      await resetChecklist.mutateAsync({ groceryListId: id });
      setIsCompletedOpen(false);
      setFeedback(
        `Checklist reset. ${completed.length} item${completed.length === 1 ? "" : "s"} moved to To buy.`
      );
    } catch {
      setFeedback(null);
      // The mutation error is rendered inline and the existing list is unchanged.
    }
  }

  async function removeList() {
    try {
      await deleteList.mutateAsync({ groceryListId: id });
      router.push("/grocery-lists");
    } catch {
      // The mutation error is rendered in the confirmation dialog.
    }
  }

  async function refreshListFromWeek() {
    refreshFromWeek.reset();
    setRefreshFeedback(null);
    try {
      await refreshFromWeek.mutateAsync({ groceryListId: id });
      const weekRange = formatGroceryListWeekRange(list.sourceWeekStartDate);
      setRefreshFeedback(
        weekRange
          ? `Grocery list refreshed from ${weekRange}.`
          : "Grocery list refreshed from its meal-plan week."
      );
    } catch {
      // The failed refresh is shown inline and the existing list remains editable.
    }
  }

  const progressLabel = `${completed.length} of ${list.items.length} items checked`;

  return (
    <>
      <AppPageShell>
        <BackLink href="/grocery-lists">Grocery lists</BackLink>
        <header className="mt-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">
                {getSourceLabel(list)}
              </p>
              <h1 className="mt-2 break-words text-3xl font-bold text-slate-900">
                {list.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600">{progressLabel}</p>
            </div>
            <div className="relative">
              <button
                aria-expanded={isActionsOpen}
                aria-busy={resetChecklist.isPending || undefined}
                aria-disabled={resetChecklist.isPending || undefined}
                aria-label="List actions"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                onClick={() => {
                  if (!resetChecklist.isPending) {
                    setIsActionsOpen((current) => !current);
                  }
                }}
                ref={actionsTriggerRef}
                type="button"
              >
                <Ellipsis className="h-5 w-5" aria-hidden="true" />
              </button>
              {isActionsOpen ? (
                <div
                  aria-label="List actions"
                  className="absolute right-0 top-12 z-10 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  ref={actionsPopoverRef}
                >
                  <button
                    className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                    onClick={() => {
                      renameList.reset();
                      setIsActionsOpen(false);
                      setIsRenameOpen(true);
                    }}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Rename list
                  </button>
                  {completed.length > 0 ? (
                    <button
                      className="flex min-h-11 w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 disabled:text-slate-400"
                      disabled={
                        resetChecklist.isPending || pendingCheckItemIds.size > 0
                      }
                      onClick={() => void resetChecklistItems()}
                      type="button"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Reset checklist
                    </button>
                  ) : null}
                  <button
                    className="flex min-h-11 w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-red-700"
                    onClick={() => {
                      deleteList.reset();
                      setIsActionsOpen(false);
                      setIsDeleteOpen(true);
                    }}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete list
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {list.items.length > 0 ||
          (list.sourceType === "meal_plan" && list.mealPlanAvailable) ? (
            <div
              className={`mt-5 grid gap-2 ${
                list.items.length > 0 &&
                list.sourceType === "meal_plan" &&
                list.mealPlanAvailable
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {list.sourceType === "meal_plan" && list.mealPlanAvailable ? (
                <ActionButton
                  disabled={resetChecklist.isPending}
                  fullWidth
                  onClick={() => void refreshListFromWeek()}
                  pending={refreshFromWeek.isPending}
                  pendingLabel="Refreshing…"
                  variant="secondary"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh from week
                </ActionButton>
              ) : null}
              {list.items.length > 0 ? (
                <ActionButton
                  fullWidth
                  onClick={(event) => openNewItem(event.currentTarget)}
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add item
                </ActionButton>
              ) : null}
            </div>
          ) : null}
        </header>

        <p aria-live="polite" className="sr-only" role="status">
          {feedback}
        </p>
        {refreshFeedback ? (
          <InlineNotice aria-live="polite" className="mt-5" tone="info">
            {refreshFeedback}
          </InlineNotice>
        ) : null}
        {list.sourceType === "meal_plan" && !list.mealPlanAvailable ? (
          <InlineNotice className="mt-5" tone="neutral">
            The original week is no longer available. This saved list stays editable,
            but it cannot be refreshed.
          </InlineNotice>
        ) : null}
        {refreshFromWeek.isError ? (
          <InlineNotice className="mt-5" role="alert" tone="error">
            {getGroceryListErrorMessage(refreshFromWeek.error, "update")}
          </InlineNotice>
        ) : null}
        {checkError || checkItem.isError ? (
          <InlineNotice className="mt-5" role="alert" tone="error">
            {getGroceryListErrorMessage(checkError ?? checkItem.error, "saveItem")}
          </InlineNotice>
        ) : null}
        {resetChecklist.isError ? (
          <InlineNotice className="mt-5" role="alert" tone="error">
            {getGroceryListErrorMessage(resetChecklist.error, "update")}
          </InlineNotice>
        ) : null}

        {list.items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-leaf-100 bg-leaf-50 p-5 text-center">
            <h2 className="text-lg font-bold text-slate-900">This list is empty</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add the first thing you need to buy.
            </p>
            <ActionButton
              className="mt-4"
              onClick={(event) => openNewItem(event.currentTarget)}
            >
              Add item
            </ActionButton>
          </section>
        ) : (
          <>
            <section aria-label="Items to buy" className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">To buy</h2>
                <p className="text-xs text-slate-500">
                  {toBuy.length} item{toBuy.length === 1 ? "" : "s"}
                </p>
              </div>
              {toBuy.length > 0 ? (
                <ul className="mt-3 border-y border-slate-200">
                  {toBuy.map((item) => (
                    <GroceryListItemRow
                      isChecking={
                        resetChecklist.isPending || pendingCheckItemIds.has(item.id)
                      }
                      item={item}
                      key={item.id}
                      onCheck={(checked) => void setChecked(item, checked)}
                      onEdit={(trigger) => openItem(item, trigger)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg bg-leaf-50 p-4 text-sm text-slate-600">
                  Everything on this list is completed.
                </p>
              )}
            </section>

            <section className="mt-6">
              <button
                aria-expanded={isCompletedOpen}
                className="flex min-h-11 w-full items-center justify-between gap-3 border-y border-slate-200 py-3 text-left"
                onClick={() => setIsCompletedOpen((current) => !current)}
                type="button"
              >
                <span className="font-semibold text-slate-900">
                  Completed ({completed.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${isCompletedOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isCompletedOpen ? (
                completed.length > 0 ? (
                  <ul className="border-b border-slate-200">
                    {completed.map((item) => (
                      <GroceryListItemRow
                        isChecking={
                          resetChecklist.isPending || pendingCheckItemIds.has(item.id)
                        }
                        item={item}
                        key={item.id}
                        onCheck={(checked) => void setChecked(item, checked)}
                        onEdit={(trigger) => openItem(item, trigger)}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-sm text-slate-500">No completed items yet.</p>
                )
              ) : null}
            </section>
          </>
        )}
      </AppPageShell>
      <RecipeNavigation activePage="grocery-lists" />

      {selectedItem ? (
        <GroceryListItemSheet
          error={selectedItem === "new" ? addItem.error : updateItem.error}
          fallbackFocusRef={actionsTriggerRef}
          isPending={selectedItem === "new" ? addItem.isPending : updateItem.isPending}
          isRemovePending={removeItem.isPending}
          item={selectedItem === "new" ? undefined : selectedItem}
          key={selectedItem === "new" ? "new" : selectedItem.id}
          onClose={closeItemSheet}
          onRemove={selectedItem === "new" ? undefined : removeSelectedItem}
          onSubmit={saveItem}
          removeError={removeItem.error}
          returnFocusRef={sheetTriggerRef}
        />
      ) : null}

      {isRenameOpen ? (
        <RenameGroceryListDialog
          error={renameList.error}
          initialTitle={list.title}
          isPending={renameList.isPending}
          onCancel={() => setIsRenameOpen(false)}
          onConfirm={rename}
          returnFocusRef={actionsTriggerRef}
        />
      ) : null}

      {isDeleteOpen ? (
        <DeleteGroceryListDialog
          error={deleteList.error}
          isPending={deleteList.isPending}
          listTitle={list.title}
          onCancel={() => setIsDeleteOpen(false)}
          onConfirm={removeList}
          returnFocusRef={actionsTriggerRef}
        />
      ) : null}
    </>
  );
}
