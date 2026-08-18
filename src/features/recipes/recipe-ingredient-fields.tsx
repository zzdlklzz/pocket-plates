"use client";

import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, GripVertical, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  AddRowButton,
  getIndexAfterInsertion,
  getIndexAfterMove,
  getIndexAfterRemoval,
  type RemovedExpandableRow,
  UndoRemovalNotice,
  useSortableRowSensors
} from "./recipe-form-list";
import type { RecipeFormValues } from "./recipe.types";
import { INGREDIENT_UNITS, MAX_INGREDIENTS } from "./recipe.validation";

export function RecipeIngredientFields() {
  const {
    control,
    formState: { errors },
    getValues
  } = useFormContext<RecipeFormValues>();
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const [expandedIngredientIndex, setExpandedIngredientIndex] = useState<number | null>(() =>
    ingredients.fields.length === 1 && !ingredients.fields[0]?.name ? 0 : null
  );
  const [removedIngredient, setRemovedIngredient] = useState<RemovedExpandableRow<RecipeFormValues["ingredients"][number]> | null>(null);
  const sensors = useSortableRowSensors();

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = ingredients.fields.findIndex((field) => field.id === active.id);
    const nextIndex = ingredients.fields.findIndex((field) => field.id === over.id);

    if (currentIndex !== -1 && nextIndex !== -1) {
      moveIngredient(currentIndex, nextIndex);
    }
  }

  function moveIngredient(from: number, to: number) {
    ingredients.move(from, to);
    setExpandedIngredientIndex((current) => getIndexAfterMove(current, from, to));
  }

  function removeIngredient(index: number) {
    setRemovedIngredient({
      index,
      value: getValues(`ingredients.${index}`),
      wasExpanded: expandedIngredientIndex === index
    });
    ingredients.remove(index);
    setExpandedIngredientIndex((current) => getIndexAfterRemoval(current, index));
  }

  function undoRemoveIngredient() {
    if (!removedIngredient) {
      return;
    }

    const restoredIndex = Math.min(removedIngredient.index, ingredients.fields.length);
    ingredients.insert(restoredIndex, removedIngredient.value);
    setExpandedIngredientIndex((current) =>
      removedIngredient.wasExpanded ? restoredIndex : getIndexAfterInsertion(current, restoredIndex)
    );
    setRemovedIngredient(null);
  }

  function addIngredient() {
    const nextIndex = ingredients.fields.length;
    setExpandedIngredientIndex(nextIndex);
    ingredients.append(
      { name: "", amount: "", unit: "", notes: "" },
      { focusName: `ingredients.${nextIndex}.name` }
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">
        Ingredients<span aria-hidden="true"> · {ingredients.fields.length}</span>
      </h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={ingredients.fields} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {ingredients.fields.map((field, index) => (
              <Fragment key={field.id}>
                {removedIngredient?.index === index ? (
                  <UndoRemovalNotice label="Ingredient removed." onUndo={undoRemoveIngredient} />
                ) : null}
                <SortableIngredientRow
                  count={ingredients.fields.length}
                  fieldId={field.id}
                  index={index}
                  isExpanded={expandedIngredientIndex === index || Boolean(errors.ingredients?.[index])}
                  onDone={() => setExpandedIngredientIndex(null)}
                  onEdit={() => setExpandedIngredientIndex(index)}
                  onRemove={removeIngredient}
                />
              </Fragment>
            ))}
            {removedIngredient && removedIngredient.index >= ingredients.fields.length ? (
              <UndoRemovalNotice label="Ingredient removed." onUndo={undoRemoveIngredient} />
            ) : null}
          </div>
        </SortableContext>
      </DndContext>
      {errors.ingredients?.message ? <p className="text-sm text-red-700">{errors.ingredients.message}</p> : null}
      {ingredients.fields.length > 1 ? <p className="text-xs text-slate-500">Press and hold a drag handle to reorder ingredients.</p> : null}
      <AddRowButton
        disabled={ingredients.fields.length >= MAX_INGREDIENTS}
        label="Add ingredient"
        onClick={addIngredient}
      />
    </section>
  );
}

type SortableIngredientRowProps = {
  count: number;
  fieldId: string;
  index: number;
  isExpanded: boolean;
  onDone: () => void;
  onEdit: () => void;
  onRemove: (index: number) => void;
};

function SortableIngredientRow({
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
