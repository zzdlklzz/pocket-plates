"use client";

import { ChevronDown, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject
} from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { RecipeNavigation } from "@/features/recipes/RecipeNavigation";
import { DeleteGroceryListDialog } from "./DeleteGroceryListDialog";
import { MAX_GROCERY_LIST_TITLE_LENGTH } from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { formatSelectedRecipeSource } from "./grocery-list.source-formatting";
import {
  useAddGroceryListItem,
  useDeleteGroceryList,
  useGroceryListDetail,
  useRemoveGroceryListItem,
  useRenameGroceryList,
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

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekRange(weekStartDate: string | null) {
  if (!weekStartDate) {
    return null;
  }

  const start = parseLocalDate(weekStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(end);

  return `${startLabel}–${endLabel}`;
}

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

  const weekRange = formatWeekRange(sourceWeekStartDate);
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
  const deleteList = useDeleteGroceryList();
  const [selectedItem, setSelectedItem] = useState<GroceryListItemDto | "new" | null>(null);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  async function removeList() {
    try {
      await deleteList.mutateAsync({ groceryListId: id });
      router.push("/grocery-lists");
    } catch {
      // The mutation error is rendered in the confirmation dialog.
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
                aria-label="List actions"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                onClick={() => setIsActionsOpen((current) => !current)}
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

          {list.items.length > 0 ? (
            <ActionButton
              className="mt-5"
              fullWidth
              onClick={(event) => openNewItem(event.currentTarget)}
              variant="secondary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </ActionButton>
          ) : null}
        </header>

        <p aria-live="polite" className="sr-only" role="status">
          {feedback}
        </p>
        {checkError || checkItem.isError ? (
          <InlineNotice className="mt-5" role="alert" tone="error">
            {getGroceryListErrorMessage(checkError ?? checkItem.error, "saveItem")}
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
                      isChecking={pendingCheckItemIds.has(item.id)}
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
                        isChecking={pendingCheckItemIds.has(item.id)}
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

type RenameGroceryListDialogProps = {
  error: unknown;
  initialTitle: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => Promise<void>;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

function RenameGroceryListDialog({
  error,
  initialTitle,
  isPending,
  onCancel,
  onConfirm,
  returnFocusRef
}: RenameGroceryListDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPendingRef = useRef(isPending);
  const onCancelRef = useRef(onCancel);
  const [title, setTitle] = useState(initialTitle);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      setValidationError("Add a list title.");
      return;
    }
    if (nextTitle.length > MAX_GROCERY_LIST_TITLE_LENGTH) {
      setValidationError(
        `Keep the title under ${MAX_GROCERY_LIST_TITLE_LENGTH} characters.`
      );
      return;
    }

    setValidationError(null);
    try {
      await onConfirm(nextTitle);
    } catch {
      // The mutation error is rendered above the actions.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-5 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <section
        aria-label="Rename grocery list"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        ref={dialogRef}
        role="dialog"
      >
        <h2 className="text-lg font-bold text-slate-900">Rename list</h2>
        <form className="mt-4" onSubmit={submit}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            List title
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
              disabled={isPending}
              maxLength={MAX_GROCERY_LIST_TITLE_LENGTH}
              onChange={(event) => {
                setTitle(event.target.value);
                setValidationError(null);
              }}
              ref={inputRef}
              value={title}
            />
          </label>
          {validationError || error ? (
            <InlineNotice className="mt-4" role="alert" tone="error">
              {validationError ?? getGroceryListErrorMessage(error, "update")}
            </InlineNotice>
          ) : null}
          <div className="mt-5 flex justify-end gap-3">
            <ActionButton disabled={isPending} onClick={onCancel} variant="secondary">
              Cancel
            </ActionButton>
            <ActionButton pending={isPending} pendingLabel="Saving..." type="submit">
              Save
            </ActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}
