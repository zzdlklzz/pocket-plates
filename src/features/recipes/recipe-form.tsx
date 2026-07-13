"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { getRecipeErrorMessage } from "./recipe.errors";
import { RecipeFormFields } from "./recipe-form-fields";
import { useCreateRecipe, useUpdateRecipe } from "./recipe.queries";
import type { RecipeFormValues } from "./recipe.types";
import { DEFAULT_RECIPE_FORM_VALUES, recipeFormSchema } from "./recipe.validation";

type RecipeFormProps = {
  initialValues?: RecipeFormValues;
  recipeId?: string;
};

export function RecipeForm({ initialValues, recipeId }: RecipeFormProps) {
  const router = useRouter();
  const [isRedirecting, startRedirect] = useTransition();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(recipeId ?? "");
  const form = useForm<RecipeFormValues>({
    defaultValues: initialValues ?? DEFAULT_RECIPE_FORM_VALUES,
    resolver: zodResolver(recipeFormSchema)
  });
  const mutation = recipeId ? updateRecipe : createRecipe;
  const isSaving = mutation.isPending || isRedirecting;

  async function onSubmit(values: RecipeFormValues) {
    const id = await mutation.mutateAsync(values);
    startRedirect(() => {
      router.push(`/recipes/${id}`);
    });
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 pb-24 pt-8 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700" href={recipeId ? `/recipes/${recipeId}` : "/"}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      </div>

      <FormProvider {...form}>
        <form aria-busy={isSaving} className="mt-5" onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset className="m-0 space-y-5 border-0 p-0 disabled:opacity-80" disabled={isSaving}>
            <RecipeFormFields isEditing={Boolean(recipeId)} />

            {mutation.error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {getRecipeErrorMessage(mutation.error, "save")}
              </p>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {isSaving ? "Saving..." : "Save recipe"}
            </button>
          </fieldset>
        </form>
      </FormProvider>
    </main>
  );
}
