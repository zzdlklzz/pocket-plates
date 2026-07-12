import { redirect } from "next/navigation";
import { RecipeEdit } from "@/features/recipes/recipe-edit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditRecipePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    redirect("/");
  }

  return <RecipeEdit id={id} />;
}
