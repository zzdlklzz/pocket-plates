"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { getGroceryListErrorMessage } from "./grocery-list.errors";

type DeleteGroceryListDialogProps = {
  error: unknown;
  isPending: boolean;
  listTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function DeleteGroceryListDialog({
  error,
  isPending,
  listTitle,
  onCancel,
  onConfirm,
  returnFocusRef
}: DeleteGroceryListDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(isPending);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const buttons = Array.from(
        dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
      );
      const firstButton = buttons[0];
      const lastButton = buttons.at(-1);

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton?.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocus?.focus();
    };
  }, [returnFocusRef]);

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
      <div
        aria-describedby="delete-grocery-list-description"
        aria-labelledby="delete-grocery-list-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl outline-none"
        ref={dialogRef}
        role="alertdialog"
      >
        <h2 className="text-lg font-bold text-slate-900" id="delete-grocery-list-title">
          Delete “{listTitle}”?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="delete-grocery-list-description">
          This removes the list and every item on it. This action cannot be undone.
        </p>
        {error ? (
          <InlineNotice className="mt-4" role="alert" tone="error">
            {getGroceryListErrorMessage(error, "delete")}
          </InlineNotice>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <button
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
            disabled={isPending}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <ActionButton
            onClick={onConfirm}
            pending={isPending}
            pendingLabel="Deleting..."
            variant="danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete list
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
