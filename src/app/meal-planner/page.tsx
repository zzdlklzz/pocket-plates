import { redirect } from "next/navigation";
import { MealPlanner } from "@/features/meal-planning/MealPlanner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MealPlannerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <MealPlanner />;
}
