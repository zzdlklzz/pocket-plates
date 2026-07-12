import { redirect } from "next/navigation";
import { RecipeDetail } from "@/features/recipes/recipe-detail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RecipeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    redirect("/");
  }

  return <RecipeDetail id={id} />;
}
