import { redirect } from "next/navigation";
import { RecipeEdit } from "@/features/recipes/recipe-edit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditRecipePageProps = {
  params: {
    id: string;
  };
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <RecipeEdit id={params.id} />;
}
