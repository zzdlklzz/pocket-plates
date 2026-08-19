import { redirect } from "next/navigation";
import { RecipeForm } from "@/features/recipes/RecipeForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
