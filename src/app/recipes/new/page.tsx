import { redirect } from "next/navigation";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewRecipePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <RecipeForm />;
}
