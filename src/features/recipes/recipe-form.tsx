"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { MEAL_TYPE_FILTERS } from "./recipe-library.constants";
import { useCreateRecipe, useUpdateRecipe } from "./recipe.queries";
import type { RecipeFormValues } from "./recipe.types";
import { DEFAULT_RECIPE_FORM_VALUES, recipeFormSchema } from "./recipe.validation";

type RecipeFormProps = {
  initialValues?: RecipeFormValues;
  recipeId?: string;
};

export function RecipeForm({ initialValues, recipeId }: RecipeFormProps) {
  const router = useRouter();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(recipeId ?? "");
  const {
    formState: { errors },
    handleSubmit,
    register,
    watch,
    setValue,
    control
  } = useForm<RecipeFormValues>({
    defaultValues: initialValues ?? DEFAULT_RECIPE_FORM_VALUES,
    resolver: zodResolver(recipeFormSchema)
  });
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const steps = useFieldArray({ control, name: "steps" });
  const selectedMealTypes = watch("mealTypes");
  const mutation = recipeId ? updateRecipe : createRecipe;

  async function onSubmit(values: RecipeFormValues) {
    const id = await mutation.mutateAsync(values);
    router.push(`/recipes/${id}`);
  }

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
    <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700" href={recipeId ? `/recipes/${recipeId}` : "/"}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <section className="space-y-3 rounded-b-3xl bg-leaf-100 px-4 pb-5 pt-4">
          <h1 className="text-2xl font-bold text-slate-900">{recipeId ? "Edit recipe" : "Add recipe"}</h1>
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
              type="number"
              {...register("servings", { valueAsNumber: true })}
            />
          </label>
          {errors.servings ? <p className="text-sm text-red-700">{errors.servings.message}</p> : null}
        </section>

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

        <section className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Source URL
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("sourceUrl")} />
          </label>
          {errors.sourceUrl ? <p className="text-sm text-red-700">{errors.sourceUrl.message}</p> : null}
          <label className="block text-sm font-medium text-slate-700">
            Image URL
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("imageUrl")} />
          </label>
          {errors.imageUrl ? <p className="text-sm text-red-700">{errors.imageUrl.message}</p> : null}
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900" {...register("notes")} />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Ingredients</h2>
            <button
              className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700"
              onClick={() => ingredients.append({ name: "", amount: "", unit: "", notes: "" })}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
          {ingredients.fields.map((field, index) => (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" key={field.id}>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Ingredient" {...register(`ingredients.${index}.name`)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Amount" {...register(`ingredients.${index}.amount`)} />
                <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Unit" {...register(`ingredients.${index}.unit`)} />
              </div>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Notes" {...register(`ingredients.${index}.notes`)} />
              {ingredients.fields.length > 1 ? (
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-700" onClick={() => ingredients.remove(index)} type="button">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {errors.ingredients ? <p className="text-sm text-red-700">{errors.ingredients.message}</p> : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Steps</h2>
            <button
              className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700"
              onClick={() => steps.append({ instruction: "", timerMinutes: "" })}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
          {steps.fields.map((field, index) => (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" key={field.id}>
              <textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={`Step ${index + 1}`} {...register(`steps.${index}.instruction`)} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Timer minutes" {...register(`steps.${index}.timerMinutes`)} />
              {steps.fields.length > 1 ? (
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-700" onClick={() => steps.remove(index)} type="button">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {errors.steps ? <p className="text-sm text-red-700">{errors.steps.message}</p> : null}
        </section>

        {mutation.error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            We could not save this recipe. Please try again.
          </p>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
          disabled={mutation.isPending}
          type="submit"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? "Saving..." : "Save recipe"}
        </button>
      </form>
    </main>
  );
}
