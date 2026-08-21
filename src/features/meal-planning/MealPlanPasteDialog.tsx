"use client";

import { useRef, type RefObject } from "react";
import { X } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { useDialogFocusManagement } from "@/components/ui/useDialogFocusManagement";

type MealPlanPasteDialogProps = {
  addCount: number;
  archivedCount: number;
  copyKind: "day" | "week";
  deletedCount: number;
  duplicateCount: number;
  error: unknown;
  hasPreview: boolean;
  isPending: boolean;
  isPreviewPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRetryPreview: () => void;
  previewError: unknown;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

function pluralizeMeals(count: number) {
  return `${count} meal${count === 1 ? "" : "s"}`;
}

export function MealPlanPasteDialog({
  addCount,
  archivedCount,
  copyKind,
  deletedCount,
  duplicateCount,
  error,
  hasPreview,
  isPending,
  isPreviewPending,
  onClose,
  onConfirm,
  onRetryPreview,
  previewError,
  returnFocusRef
}: MealPlanPasteDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useDialogFocusManagement({
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    isBusy: isPending,
    onClose,
    returnFocusRef
  });

  const title = `Paste copied ${copyKind}?`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        ref={dialogRef}
        role="dialog"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            aria-label="Close paste preview"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            disabled={isPending}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 min-h-0 overflow-y-auto">
          {isPreviewPending ? (
            <InlineNotice aria-live="polite" role="status" tone="info">
              Checking copied meals...
            </InlineNotice>
          ) : previewError ? (
            <InlineNotice className="flex items-center justify-between gap-3" role="alert" tone="error">
              <span>We could not check these copied meals.</span>
              <button
                className="shrink-0 font-semibold underline"
                onClick={onRetryPreview}
                type="button"
              >
                Try again
              </button>
            </InlineNotice>
          ) : hasPreview ? (
            <>
              <p className="text-base font-semibold text-slate-900">
                {pluralizeMeals(addCount)} will be added
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Existing meals stay in place. Unavailable recipes and exact duplicates are skipped.
              </p>

              <dl className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <PasteCount label="Ready to add" value={addCount} />
                <PasteCount label="Duplicates" value={duplicateCount} />
                <PasteCount label="Archived recipes" value={archivedCount} />
                <PasteCount label="Deleted or unavailable" value={deletedCount} />
              </dl>
            </>
          ) : null}

          {error ? (
            <InlineNotice className="mt-4" role="alert" tone="error">
              We could not paste these meals. No existing meals were removed. Please try again.
            </InlineNotice>
          ) : null}

          <ActionButton
            className="mt-5"
            disabled={!hasPreview || Boolean(previewError) || isPreviewPending || addCount === 0}
            fullWidth
            onClick={onConfirm}
            pending={isPending}
            pendingLabel="Pasting meals..."
          >
            {!hasPreview || isPreviewPending
              ? "Checking copied meals..."
              : addCount === 0
                ? "Nothing to paste"
                : `Paste ${pluralizeMeals(addCount)}`}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

function PasteCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
