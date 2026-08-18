"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ActionButton } from "@/components/ui/action-button";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { BackLink } from "@/components/ui/back-link";
import { InlineNotice } from "@/components/ui/inline-notice";
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
    <AppPageShell>
      <div className="flex items-center justify-between gap-3">
        <BackLink href={recipeId ? `/recipes/${recipeId}` : "/"}>Back</BackLink>
      </div>

      <FormProvider {...form}>
        <form aria-busy={isSaving} className="mt-5" onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset className="m-0 min-w-0 w-full space-y-5 border-0 p-0 disabled:opacity-80" disabled={isSaving}>
            <RecipeFormFields isEditing={Boolean(recipeId)} />

            {mutation.error ? (
              <InlineNotice padding="compact" tone="error">
                {getRecipeErrorMessage(mutation.error, "save")}
              </InlineNotice>
            ) : null}

            <ActionButton fullWidth pending={isSaving} pendingLabel="Saving..." type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save recipe
            </ActionButton>
          </fieldset>
        </form>
      </FormProvider>
    </AppPageShell>
  );
}
