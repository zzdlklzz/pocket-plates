"use client";

import { Check, Trash2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import type { RecipeFormValues } from "./recipe.types";

type ExpandableStepRowProps = {
  count: number;
  index: number;
  isExpanded: boolean;
  onDone: () => void;
  onEdit: () => void;
  onRemove: (index: number) => void;
};

export function ExpandableStepRow({ count, index, isExpanded, onDone, onEdit, onRemove }: ExpandableStepRowProps) {
  const {
    control,
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();
  const instruction = useWatch({ control, name: `steps.${index}.instruction` });
  const stepNumber = index + 1;
  const summary = instruction?.trim() || "New step";

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2">
      <div className="flex min-h-14 items-center gap-1">
        <span className="w-8 shrink-0 text-center text-xs font-semibold text-leaf-700">{stepNumber}</span>

        {isExpanded ? (
          <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-slate-700">Step {stepNumber}</span>
        ) : (
          <button
            aria-expanded="false"
            aria-label={`Edit step ${stepNumber}: ${summary}`}
            className="min-w-0 flex-1 truncate rounded-lg px-2 py-3 text-left text-sm text-slate-700 active:bg-leaf-50"
            onClick={onEdit}
            type="button"
          >
            {summary}
          </button>
        )}

        {isExpanded ? (
          <button
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-leaf-700 active:bg-leaf-50"
            onClick={onDone}
            type="button"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Done
          </button>
        ) : null}

        {count > 1 ? (
          <button
            aria-label={`Remove step ${stepNumber}`}
            className="inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-red-700 active:bg-red-50"
            onClick={() => onRemove(index)}
            type="button"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="space-y-2 border-t border-slate-100 px-1 pb-3 pt-3">
          <label className="block text-xs font-medium text-slate-600">
            Instruction
            <textarea
              aria-invalid={errors.steps?.[index]?.instruction ? "true" : "false"}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={`Step ${stepNumber}`}
              {...register(`steps.${index}.instruction`)}
            />
          </label>
          {errors.steps?.[index]?.instruction ? <p className="text-xs text-red-700">{errors.steps[index]?.instruction?.message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
