import { redirect } from "next/navigation";
import { RecipeDetail } from "@/features/recipes/recipe-detail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RecipeDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <RecipeDetail id={params.id} />;
}
