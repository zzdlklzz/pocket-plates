"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { getRecipeErrorMessage } from "./recipe.errors";
import { RecipeFormFields } from "./RecipeFormFields";
import { useCreateRecipe, useUpdateRecipe } from "./recipe.queries";
import type { RecipeFormValues, RecipeImageChange } from "./recipe.types";
import { DEFAULT_RECIPE_FORM_VALUES, recipeFormSchema } from "./recipe.validation";

type RecipeFormProps = {
  initialImageUrl?: string | null;
  initialValues?: RecipeFormValues;
  recipeId?: string;
};

export function RecipeForm({ initialImageUrl, initialValues, recipeId }: RecipeFormProps) {
  const router = useRouter();
  const [isRedirecting, startRedirect] = useTransition();
  const [imageChange, setImageChange] = useState<RecipeImageChange>({ type: "keep" });
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(recipeId ?? "");
  const form = useForm<RecipeFormValues>({
    defaultValues: initialValues ?? DEFAULT_RECIPE_FORM_VALUES,
    resolver: zodResolver(recipeFormSchema)
  });
  const mutation = recipeId ? updateRecipe : createRecipe;
  const isSaving = mutation.isPending || isRedirecting || isImageProcessing;

  async function onSubmit(values: RecipeFormValues) {
    if (isImageProcessing) {
      return;
    }

    const id = await mutation.mutateAsync({ imageChange, values });
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
            <RecipeFormFields
              initialImageUrl={initialImageUrl}
              isEditing={Boolean(recipeId)}
              onImageChange={setImageChange}
              onImageProcessingChange={setIsImageProcessing}
            />

            {mutation.error ? (
              <InlineNotice padding="compact" tone="error">
                {getRecipeErrorMessage(mutation.error, "save")}
              </InlineNotice>
            ) : null}

            <ActionButton
              fullWidth
              pending={isSaving}
              pendingLabel={isImageProcessing ? "Processing image..." : "Saving..."}
              type="submit"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save recipe
            </ActionButton>
          </fieldset>
        </form>
      </FormProvider>
    </AppPageShell>
  );
}
