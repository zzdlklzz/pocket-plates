import { redirect } from "next/navigation";
import { MealPlanner } from "@/features/meal-planning/MealPlanner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MealPlannerPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MealPlannerPage({ searchParams }: MealPlannerPageProps = {}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const requestedWeek = resolvedSearchParams?.week;

  return (
    <MealPlanner
      requestedWeek={Array.isArray(requestedWeek) ? undefined : requestedWeek}
    />
  );
}
