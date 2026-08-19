import { redirect } from "next/navigation";
import { ArchivedRecipeLibrary } from "@/features/recipes/archived-recipe-library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ArchivedRecipesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <ArchivedRecipeLibrary />;
}
