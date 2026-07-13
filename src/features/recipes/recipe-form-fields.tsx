"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import { SortableIngredientRow } from "./sortable-ingredient-row";
import type { RecipeFormValues } from "./recipe.types";
import { MAX_INGREDIENTS, MAX_SERVINGS, MAX_SOURCE_LINKS, MAX_STEPS } from "./recipe.validation";

type RecipeFormFieldsProps = {
  isEditing: boolean;
};

export function RecipeFormFields({ isEditing }: RecipeFormFieldsProps) {
  return (
    <>
      <RecipeBasicsFields isEditing={isEditing} />
      <RecipeMealTypeFields />
      <RecipeOptionalFields />
      <RecipeSourceFields />
      <RecipeIngredientFields />
      <RecipeStepFields />
    </>
  );
}

function RecipeBasicsFields({ isEditing }: RecipeFormFieldsProps) {
  const {
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();

  return (
    <section className="space-y-3 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
      <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Edit recipe" : "Add recipe"}</h1>
      <label className="block text-sm font-medium text-slate-700">
        Title
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-leaf-700"
          {...register("title")}
        />
      </label>
      {errors.title ? <p className="text-sm text-red-700">{errors.title.message}</p> : null}
      <label className="block text-sm font-medium text-slate-700">
        Servings
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-leaf-700"
          min={1}
          max={MAX_SERVINGS}
          type="number"
          {...register("servings", { valueAsNumber: true })}
        />
      </label>
      {errors.servings ? <p className="text-sm text-red-700">{errors.servings.message}</p> : null}
    </section>
  );
}

function RecipeMealTypeFields() {
  const {
    control,
    formState: { errors },
    setValue
  } = useFormContext<RecipeFormValues>();
  const selectedMealTypes = useWatch({ control, name: "mealTypes" }) ?? [];

  function toggleMealType(mealType: RecipeFormValues["mealTypes"][number]) {
    setValue(
      "mealTypes",
      selectedMealTypes.includes(mealType)
        ? selectedMealTypes.filter((selected) => selected !== mealType)
        : [...selectedMealTypes, mealType],
      { shouldValidate: true }
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-800">Meal types</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {MEAL_TYPE_FILTERS.map((filter) => {
          const isSelected = selectedMealTypes.includes(filter.value);

          return (
            <button
              aria-pressed={isSelected}
              className={
                isSelected
                  ? "rounded-full bg-leaf-700 px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-full border border-leaf-100 bg-leaf-50 px-3 py-2 text-xs font-medium text-slate-600"
              }
              key={filter.value}
              onClick={() => toggleMealType(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      {errors.mealTypes ? <p className="mt-2 text-sm text-red-700">{errors.mealTypes.message}</p> : null}
    </section>
  );
}

function RecipeOptionalFields() {
  const { register } = useFormContext<RecipeFormValues>();

  return (
    <section className="grid grid-cols-2 gap-3">
      <label className="block text-sm font-medium text-slate-700">
        Cost
        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" {...register("costRating")}>
          <option value="">Optional</option>
          <option value="very_cheap">Very cheap</option>
          <option value="cheap">Cheap</option>
          <option value="moderate">Moderate</option>
          <option value="splurge">Splurge</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Difficulty
        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" {...register("difficulty")}>
          <option value="">Optional</option>
          <option value="beginner_friendly">Beginner</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
    </section>
  );
}

function RecipeSourceFields() {
  const {
    control,
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();
  const sourceLinks = useFieldArray({ control, name: "sourceLinks" });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Sources</h2>
      {sourceLinks.fields.map((field, index) => (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" key={field.id}>
          <input
            aria-invalid={errors.sourceLinks?.[index]?.label ? "true" : "false"}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Label (optional)"
            {...register(`sourceLinks.${index}.label`)}
          />
          {errors.sourceLinks?.[index]?.label ? <p className="text-xs text-red-700">{errors.sourceLinks[index]?.label?.message}</p> : null}
          <input
            aria-invalid={errors.sourceLinks?.[index]?.url ? "true" : "false"}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            inputMode="url"
            placeholder="https://example.com/recipe"
            type="url"
            {...register(`sourceLinks.${index}.url`)}
          />
          {errors.sourceLinks?.[index]?.url ? <p className="text-xs text-red-700">{errors.sourceLinks[index]?.url?.message}</p> : null}
          <RemoveRowButton onClick={() => sourceLinks.remove(index)} />
        </div>
      ))}
      {errors.sourceLinks?.root ? <p className="text-sm text-red-700">{errors.sourceLinks.root.message}</p> : null}
      <AddRowButton
        disabled={sourceLinks.fields.length >= MAX_SOURCE_LINKS}
        label="Add source"
        onClick={() =>
          sourceLinks.append(
            { label: "", url: "" },
            { focusName: `sourceLinks.${sourceLinks.fields.length}.url` }
          )
        }
      />
      <RecipeNotesFields />
    </section>
  );
}

function RecipeNotesFields() {
  const {
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();

  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        Image URL
        <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("imageUrl")} />
      </label>
      {errors.imageUrl ? <p className="text-sm text-red-700">{errors.imageUrl.message}</p> : null}
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("notes")} />
      </label>
    </>
  );
}

function RecipeIngredientFields() {
  const { control } = useFormContext<RecipeFormValues>();
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const sensors = useSensors(
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

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = ingredients.fields.findIndex((field) => field.id === active.id);
    const nextIndex = ingredients.fields.findIndex((field) => field.id === over.id);

    if (currentIndex !== -1 && nextIndex !== -1) {
      ingredients.move(currentIndex, nextIndex);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Ingredients</h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={ingredients.fields} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {ingredients.fields.map((field, index) => (
              <SortableIngredientRow
                count={ingredients.fields.length}
                fieldId={field.id}
                index={index}
                key={field.id}
                onMove={ingredients.move}
                onRemove={ingredients.remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {ingredients.fields.length > 1 ? <p className="text-xs text-slate-500">Drag ingredients or use the arrow buttons to change their order.</p> : null}
      <AddRowButton
        disabled={ingredients.fields.length >= MAX_INGREDIENTS}
        label="Add ingredient"
        onClick={() =>
          ingredients.append(
            { name: "", amount: "", unit: "", notes: "" },
            { focusName: `ingredients.${ingredients.fields.length}.name` }
          )
        }
      />
    </section>
  );
}

function RecipeStepFields() {
  const {
    control,
    formState: { errors },
    register
  } = useFormContext<RecipeFormValues>();
  const steps = useFieldArray({ control, name: "steps" });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Steps</h2>
      {steps.fields.map((field, index) => (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" key={field.id}>
          <textarea
            aria-invalid={errors.steps?.[index]?.instruction ? "true" : "false"}
            className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={`Step ${index + 1}`}
            {...register(`steps.${index}.instruction`)}
          />
          {errors.steps?.[index]?.instruction ? <p className="text-xs text-red-700">{errors.steps[index]?.instruction?.message}</p> : null}
          {steps.fields.length > 1 ? <RemoveRowButton onClick={() => steps.remove(index)} /> : null}
        </div>
      ))}
      {errors.steps ? <p className="text-sm text-red-700">{errors.steps.message}</p> : null}
      <AddRowButton
        disabled={steps.fields.length >= MAX_STEPS}
        label="Add step"
        onClick={() =>
          steps.append(
            { instruction: "" },
            { focusName: `steps.${steps.fields.length}.instruction` }
          )
        }
      />
    </section>
  );
}

function AddRowButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
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

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-700" onClick={onClick} type="button">
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      Remove
    </button>
  );
}
