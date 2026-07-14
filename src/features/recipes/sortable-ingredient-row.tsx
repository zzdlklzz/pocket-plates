"use client";

import { useSortable } from "@dnd-kit/sortable";
import { Check, GripVertical, Trash2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import type { RecipeFormValues } from "./recipe.types";
import { INGREDIENT_UNITS } from "./recipe.validation";

type SortableIngredientRowProps = {
  count: number;
  fieldId: string;
  index: number;
  isExpanded: boolean;
  onDone: () => void;
  onEdit: () => void;
  onRemove: (index: number) => void;
};

export function SortableIngredientRow({
  count,
  fieldId,
  index,
  isExpanded,
  onDone,
  onEdit,
  onRemove
}: SortableIngredientRowProps) {
  const {
    control,
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();
  const ingredient = useWatch({ control, name: `ingredients.${index}` });
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
  const summary = formatIngredientSummary(ingredient) || "New ingredient";
  const transformStyle = transform
    ? `translate3d(0, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;

  return (
    <div
      className={
        isDragging
          ? "relative z-10 rounded-lg border border-leaf-700 bg-white px-2 shadow-lg"
          : "rounded-lg border border-slate-200 bg-white px-2"
      }
      ref={setNodeRef}
      style={{ transform: transformStyle, transition }}
    >
      <div className="flex min-h-14 items-center gap-1">
        {count > 1 ? (
          <button
            aria-label={`Drag ingredient ${ingredientNumber}`}
            className="inline-flex h-11 w-10 shrink-0 touch-none items-center justify-center rounded-lg text-slate-500 active:bg-leaf-50"
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}

        {isExpanded ? (
          <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-slate-700">Ingredient {ingredientNumber}</span>
        ) : (
          <button
            aria-expanded="false"
            aria-label={`Edit ingredient ${ingredientNumber}: ${summary}`}
            className="min-w-0 flex-1 truncate rounded-lg px-2 py-3 text-left text-sm text-slate-700 active:bg-leaf-50"
            onClick={onEdit}
            type="button"
          >
            <span className="mr-2 text-xs font-medium text-slate-400">{ingredientNumber}</span>
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
            aria-label={`Remove ingredient ${ingredientNumber}`}
            className="inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-red-700 active:bg-red-50"
            onClick={() => onRemove(index)}
            type="button"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="space-y-3 border-t border-slate-100 px-1 pb-3 pt-3">
          <label className="block text-xs font-medium text-slate-600">
            Ingredient
            <input
              aria-invalid={errors.ingredients?.[index]?.name ? "true" : "false"}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ingredient"
              {...register(`ingredients.${index}.name`)}
            />
          </label>
          {errors.ingredients?.[index]?.name ? <p className="text-xs text-red-700">{errors.ingredients[index]?.name?.message}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Amount
                <input
                  aria-invalid={errors.ingredients?.[index]?.amount ? "true" : "false"}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  inputMode="decimal"
                  placeholder="Amount"
                  {...register(`ingredients.${index}.amount`)}
                />
              </label>
              {errors.ingredients?.[index]?.amount ? <p className="mt-1 text-xs text-red-700">{errors.ingredients[index]?.amount?.message}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Unit
                <select
                  aria-invalid={errors.ingredients?.[index]?.unit ? "true" : "false"}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  {...register(`ingredients.${index}.unit`)}
                >
                  <option value="">None</option>
                  {INGREDIENT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              {errors.ingredients?.[index]?.unit ? <p className="mt-1 text-xs text-red-700">{errors.ingredients[index]?.unit?.message}</p> : null}
            </div>
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Preparation note
            <input
              aria-invalid={errors.ingredients?.[index]?.notes ? "true" : "false"}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Optional"
              {...register(`ingredients.${index}.notes`)}
            />
          </label>
          {errors.ingredients?.[index]?.notes ? <p className="text-xs text-red-700">{errors.ingredients[index]?.notes?.message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function formatIngredientSummary(ingredient: RecipeFormValues["ingredients"][number] | undefined) {
  if (!ingredient) {
    return "";
  }

  const quantity = [ingredient.amount, ingredient.unit].filter(Boolean).join(" ");
  const main = [quantity, ingredient.name].filter(Boolean).join(" ");

  return ingredient.notes ? `${main || "Ingredient"} · ${ingredient.notes}` : main;
}
