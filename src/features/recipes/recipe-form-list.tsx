"use client";

import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

export type RemovedRow<T> = {
  index: number;
  value: T;
};

export type RemovedExpandableRow<T> = RemovedRow<T> & {
  wasExpanded: boolean;
};

export function useSortableRowSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
}

export function getIndexAfterMove(current: number | null, from: number, to: number) {
  if (current === null || from === to) {
    return current;
  }

  if (current === from) {
    return to;
  }

  if (from < current && to >= current) {
    return current - 1;
  }

  if (from > current && to <= current) {
    return current + 1;
  }

  return current;
}

export function getIndexAfterRemoval(current: number | null, removed: number) {
  if (current === null || current < removed) {
    return current;
  }

  return current === removed ? null : current - 1;
}

export function getIndexAfterInsertion(current: number | null, inserted: number) {
  if (current === null || current < inserted) {
    return current;
  }

  return current + 1;
}

export function AddRowButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-leaf-100 bg-leaf-50 px-4 py-3 text-sm font-semibold text-leaf-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

export function UndoRemovalNotice({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span aria-live="polite" role="status">
        {label}
      </span>
      <button className="shrink-0 rounded-lg px-2 py-1 font-semibold text-leaf-700 active:bg-leaf-100" onClick={onUndo} type="button">
        Undo
      </button>
    </div>
  );
}
