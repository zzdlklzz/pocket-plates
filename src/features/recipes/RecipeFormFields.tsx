"use client";

import { Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { AddRowButton, type RemovedRow, UndoRemovalNotice } from "./recipe-form-list";
import { RecipeImageField } from "./RecipeImageField";
import { RecipeIngredientFields } from "./RecipeIngredientFields";
import { RecipeDiscoveryFields } from "./RecipeDiscoveryFields";
import { COST_RATING_FILTERS, DIFFICULTY_FILTERS, MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import { RecipeStepFields } from "./RecipeStepFields";
import type { RecipeFormValues, RecipeImageChange } from "./recipe.types";
import { MAX_SERVINGS, MAX_SOURCE_LINKS } from "./recipe.validation";

type RecipeFormFieldsProps = {
  initialImageUrl?: string | null;
  isEditing: boolean;
  onImageChange: (change: RecipeImageChange) => void;
  onImageProcessingChange: (isProcessing: boolean) => void;
};

export function RecipeFormFields({
  initialImageUrl,
  isEditing,
  onImageChange,
  onImageProcessingChange
}: RecipeFormFieldsProps) {
  return (
    <>
      <RecipeBasicsFields isEditing={isEditing} />
      <RecipeMealTypeFields />
      <RecipeOptionalFields />
      <RecipeDiscoveryFields />
      <RecipeImageField
        initialImageUrl={initialImageUrl}
        onChange={onImageChange}
        onProcessingChange={onImageProcessingChange}
      />
      <RecipeSourceFields />
      <RecipeIngredientFields />
      <RecipeStepFields />
    </>
  );
}

function RecipeBasicsFields({ isEditing }: { isEditing: boolean }) {
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
            <SelectableChip
              key={filter.value}
              onClick={() => toggleMealType(filter.value)}
              selected={isSelected}
            >
              {filter.label}
            </SelectableChip>
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
          {COST_RATING_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Difficulty
        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" {...register("difficulty")}>
          <option value="">Optional</option>
          {DIFFICULTY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function RecipeSourceFields() {
  const {
    control,
    formState: { errors },
    getValues,
    register
  } = useFormContext<RecipeFormValues>();
  const sourceLinks = useFieldArray({ control, name: "sourceLinks" });
  const [removedSource, setRemovedSource] = useState<RemovedRow<RecipeFormValues["sourceLinks"][number]> | null>(null);

  function removeSource(index: number) {
    setRemovedSource({ index, value: getValues(`sourceLinks.${index}`) });
    sourceLinks.remove(index);
  }

  function undoRemoveSource() {
    if (!removedSource) {
      return;
    }

    sourceLinks.insert(Math.min(removedSource.index, sourceLinks.fields.length), removedSource.value);
    setRemovedSource(null);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Sources</h2>
      {sourceLinks.fields.map((field, index) => (
        <Fragment key={field.id}>
          {removedSource?.index === index ? <UndoRemovalNotice label="Source removed." onUndo={undoRemoveSource} /> : null}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
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
            <RemoveRowButton onClick={() => removeSource(index)} />
          </div>
        </Fragment>
      ))}
      {removedSource && removedSource.index >= sourceLinks.fields.length ? (
        <UndoRemovalNotice label="Source removed." onUndo={undoRemoveSource} />
      ) : null}
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
  const { register } = useFormContext<RecipeFormValues>();

  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("notes")} />
      </label>
    </>
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
