"use client";

import { Trash2, X } from "lucide-react";
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
  MAX_GROCERY_LIST_ITEM_NAME_LENGTH,
  MAX_GROCERY_LIST_ITEM_NOTE_LENGTH,
  MAX_GROCERY_LIST_UNIT_LENGTH
} from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { groceryListItemSchema } from "./grocery-list.validation";
import type { GroceryListItemDto } from "./grocery-list.types";

export type GroceryListItemFormValues = {
  amount: string;
  name: string;
  notes: string;
  unit: string;
};

type GroceryListItemSheetProps = {
  error: unknown;
  fallbackFocusRef?: RefObject<HTMLButtonElement | null>;
  isPending: boolean;
  isRemovePending: boolean;
  item?: GroceryListItemDto;
  onClose: () => void;
  onRemove?: () => Promise<void>;
  onSubmit: (
    values: GroceryListItemFormValues,
    quantityOverridden: boolean
  ) => Promise<void>;
  removeError: unknown;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function GroceryListItemSheet({
  error,
  fallbackFocusRef,
  isPending,
  isRemovePending,
  item,
  onClose,
  onRemove,
  onSubmit,
  removeError,
  returnFocusRef
}: GroceryListItemSheetProps) {
  const isEditing = Boolean(item);
  const isGenerated = Boolean(item && !item.isManual && item.sources.length > 0);
  const isBusy = isPending || isRemovePending;
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isBusyRef = useRef(isBusy);
  const onCloseRef = useRef(onClose);
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item?.amount?.toString() ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [usesPracticalAmount, setUsesPracticalAmount] = useState(
    !isGenerated || Boolean(item?.quantityOverridden)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    const fallbackFocus = fallbackFocusRef?.current;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      } else {
        fallbackFocus?.focus();
      }
    };
  }, [fallbackFocusRef, returnFocusRef]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedAmount = usesPracticalAmount ? amount : "";
    const submittedUnit = usesPracticalAmount ? unit : "";
    const result = groceryListItemSchema.safeParse({
      amount: submittedAmount,
      name,
      notes,
      unit: submittedUnit
    });

    if (!result.success) {
      const amountIssue = result.error.issues.find(
        ({ path }) => path[0] === "amount"
      );
      setValidationError(
        amountIssue?.message ?? result.error.issues[0]?.message ?? "Check the item details."
      );
      return;
    }

    if (isGenerated && usesPracticalAmount && !result.data.amount) {
      setValidationError("Add an amount, or use recipe requirements.");
      return;
    }

    setValidationError(null);
    try {
      await onSubmit(result.data, isGenerated && usesPracticalAmount);
    } catch {
      // The mutation error is rendered above the actions.
    }
  }

  async function remove() {
    if (!onRemove) {
      return;
    }

    try {
      await onRemove();
    } catch {
      // The mutation error is rendered above the actions.
    }
  }

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
        aria-label={isEditing ? `Edit ${item?.name}` : "Add item"}
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        ref={dialogRef}
        role="dialog"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Edit item" : "Add item"}
          </h2>
          <button
            aria-label={isEditing ? "Close edit item" : "Close add item"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            disabled={isBusy}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-4 min-h-0 overflow-y-auto" onSubmit={submit}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Item
            <input
              autoFocus
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
              disabled={isBusy}
              maxLength={MAX_GROCERY_LIST_ITEM_NAME_LENGTH}
              onChange={(event) => {
                setName(event.target.value);
                setValidationError(null);
              }}
              value={name}
            />
          </label>

          {isGenerated && !usesPracticalAmount ? (
            <ActionButton
              className="mt-4"
              fullWidth
              onClick={() => {
                setUsesPracticalAmount(true);
                setValidationError(null);
              }}
              variant="secondary"
            >
              Set a practical shopping amount
            </ActionButton>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
                    disabled={isBusy}
                    inputMode="decimal"
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Optional"
                    value={amount}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unit
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
                    disabled={isBusy}
                    maxLength={MAX_GROCERY_LIST_UNIT_LENGTH}
                    onChange={(event) => {
                      setUnit(event.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Optional"
                    value={unit}
                  />
                </label>
              </div>
              {isGenerated ? (
                <button
                  className="mt-3 min-h-11 text-sm font-semibold text-leaf-700"
                  disabled={isBusy}
                  onClick={() => {
                    setAmount("");
                    setUnit("");
                    setUsesPracticalAmount(false);
                    setValidationError(null);
                  }}
                  type="button"
                >
                  Use recipe requirements
                </button>
              ) : null}
            </>
          )}

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Note
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-base text-slate-800"
              disabled={isBusy}
              maxLength={MAX_GROCERY_LIST_ITEM_NOTE_LENGTH}
              onChange={(event) => {
                setNotes(event.target.value);
                setValidationError(null);
              }}
              placeholder="Optional"
              value={notes}
            />
          </label>

          {validationError || error || removeError ? (
            <InlineNotice className="mt-4" role="alert" tone="error">
              {validationError ??
                (removeError
                  ? getGroceryListErrorMessage(removeError, "saveItem")
                  : getGroceryListErrorMessage(error, "saveItem"))}
            </InlineNotice>
          ) : null}

          <ActionButton
            className="mt-5"
            fullWidth
            pending={isPending}
            pendingLabel="Saving..."
            type="submit"
          >
            {isEditing ? "Save changes" : "Add item"}
          </ActionButton>

          {onRemove ? (
            <ActionButton
              className="mt-3"
              fullWidth
              onClick={remove}
              pending={isRemovePending}
              pendingLabel="Removing..."
              variant="danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove item
            </ActionButton>
          ) : null}
        </form>
      </section>
    </div>
  );
}
