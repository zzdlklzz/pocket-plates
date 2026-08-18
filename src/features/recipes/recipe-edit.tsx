"use client";

import Link from "next/link";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { InlineNotice } from "@/components/ui/inline-notice";
import { getRecipeErrorMessage } from "./recipe.errors";
import { toRecipeFormValues } from "./recipe.mappers";
import { useRecipeDetail } from "./recipe.queries";
import { RecipeForm } from "./recipe-form";
import { RecipeFormSkeleton } from "./recipe-skeletons";

type RecipeEditProps = {
  id: string;
};

export function RecipeEdit({ id }: RecipeEditProps) {
  const { data: recipe, error, isLoading } = useRecipeDetail(id);

  if (isLoading) {
    return <RecipeFormSkeleton />;
  }

  if (error || !recipe) {
    return (
      <AppPageShell spacing="compact">
        <InlineNotice tone="neutral">
          {error ? getRecipeErrorMessage(error, "loadDetail") : "We could not find this recipe."}
        </InlineNotice>
        <Link className="mt-4 inline-flex text-sm font-semibold text-leaf-700" href="/">
          Back to library
        </Link>
      </AppPageShell>
    );
  }

  return <RecipeForm initialValues={toRecipeFormValues(recipe)} recipeId={id} />;
}
