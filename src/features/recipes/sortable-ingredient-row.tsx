"use client";

import { useSortable } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { RecipeFormValues } from "./recipe.types";
import { INGREDIENT_UNITS } from "./recipe.validation";

type SortableIngredientRowProps = {
  count: number;
  fieldId: string;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
};

export function SortableIngredientRow({ count, fieldId, index, onMove, onRemove }: SortableIngredientRowProps) {
  const {
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition
  } = useSortable({ disabled: count < 2, id: fieldId });
  const ingredientNumber = index + 1;
  const transformStyle = transform
    ? `translate3d(0, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;

  return (
    <div
      className={
        isDragging
          ? "relative z-10 space-y-2 rounded-lg border border-leaf-700 bg-white p-3 shadow-lg"
          : "space-y-2 rounded-lg border border-slate-200 bg-white p-3"
      }
      ref={setNodeRef}
      style={{ transform: transformStyle, transition }}
    >
      {count > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label={`Drag ingredient ${ingredientNumber}`}
            className="inline-flex h-10 w-10 touch-none items-center justify-center rounded-lg text-slate-500 active:bg-leaf-50"
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="flex-1 text-xs font-medium text-slate-500">Ingredient {ingredientNumber}</span>
          <button
            aria-label={`Move ingredient ${ingredientNumber} up`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 enabled:active:bg-leaf-50 disabled:text-slate-300"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            type="button"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label={`Move ingredient ${ingredientNumber} down`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 enabled:active:bg-leaf-50 disabled:text-slate-300"
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
            type="button"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <input
        aria-invalid={errors.ingredients?.[index]?.name ? "true" : "false"}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder="Ingredient"
        {...register(`ingredients.${index}.name`)}
      />
      {errors.ingredients?.[index]?.name ? <p className="text-xs text-red-700">{errors.ingredients[index]?.name?.message}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            aria-invalid={errors.ingredients?.[index]?.amount ? "true" : "false"}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder="Amount"
            {...register(`ingredients.${index}.amount`)}
          />
          {errors.ingredients?.[index]?.amount ? <p className="mt-1 text-xs text-red-700">{errors.ingredients[index]?.amount?.message}</p> : null}
        </div>
        <div>
          <select
            aria-invalid={errors.ingredients?.[index]?.unit ? "true" : "false"}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            {...register(`ingredients.${index}.unit`)}
          >
            <option value="">Unit</option>
            {INGREDIENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {errors.ingredients?.[index]?.unit ? <p className="mt-1 text-xs text-red-700">{errors.ingredients[index]?.unit?.message}</p> : null}
        </div>
      </div>
      <input
        aria-invalid={errors.ingredients?.[index]?.notes ? "true" : "false"}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder="Notes"
        {...register(`ingredients.${index}.notes`)}
      />
      {errors.ingredients?.[index]?.notes ? <p className="text-xs text-red-700">{errors.ingredients[index]?.notes?.message}</p> : null}
      {count > 1 ? (
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-700" onClick={() => onRemove(index)} type="button">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      ) : null}
    </div>
  );
}
