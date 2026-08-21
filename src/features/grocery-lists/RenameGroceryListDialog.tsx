"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { useDialogFocusManagement } from "@/components/ui/useDialogFocusManagement";
import { MAX_GROCERY_LIST_TITLE_LENGTH } from "./grocery-list.constants";
import { getGroceryListErrorMessage } from "./grocery-list.errors";
import { validateGroceryListTitle } from "./grocery-list.validation";

type RenameGroceryListDialogProps = {
  error: unknown;
  initialTitle: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => Promise<void>;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function RenameGroceryListDialog({
  error,
  initialTitle,
  isPending,
  onCancel,
  onConfirm,
  returnFocusRef
}: RenameGroceryListDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [validationError, setValidationError] = useState<string | null>(null);

  useDialogFocusManagement({
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    isBusy: isPending,
    onClose: onCancel,
    returnFocusRef
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateGroceryListTitle(title);

    if (result.error || !result.title) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    try {
      await onConfirm(result.title);
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
