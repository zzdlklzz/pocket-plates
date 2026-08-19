"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { getRecipeErrorMessage } from "./recipe.errors";

type DeleteArchivedRecipesDialogProps = {
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  recipeTitles: string[];
};

export function DeleteArchivedRecipesDialog({
  error,
  isPending,
  onCancel,
  onConfirm,
  recipeTitles
}: DeleteArchivedRecipesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const recipeCount = recipeTitles.length;
  const visibleTitles = recipeTitles.slice(0, 3);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-5 py-8">
      <div
        aria-describedby="delete-archived-description"
        aria-labelledby="delete-archived-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl outline-none"
        ref={dialogRef}
        role="alertdialog"
        tabIndex={-1}
      >
        <h2 className="text-lg font-bold text-slate-900" id="delete-archived-title">
          Permanently delete {recipeCount} recipe{recipeCount === 1 ? "" : "s"}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="delete-archived-description">
          This removes the selected recipes and their saved details. This action cannot be undone.
        </p>

        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {visibleTitles.map((title, index) => (
            <li key={`${title}-${index}`}>{title}</li>
          ))}
          {recipeCount > visibleTitles.length ? <li>And {recipeCount - visibleTitles.length} more</li> : null}
        </ul>

        {error ? (
          <InlineNotice className="mt-4" role="alert" tone="error">
            {getRecipeErrorMessage(error, "delete")}
          </InlineNotice>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <ActionButton disabled={isPending} onClick={onCancel} variant="secondary">
            Cancel
          </ActionButton>
          <ActionButton onClick={onConfirm} pending={isPending} pendingLabel="Deleting..." variant="danger">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete permanently
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
