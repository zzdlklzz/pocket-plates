import { redirect } from "next/navigation";
import { NewGroceryList } from "@/features/grocery-lists/GroceryListLibrary";
import {
  getWeekStart,
  parseIsoDate
} from "@/features/meal-planning/meal-planning.dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NewGroceryListPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewGroceryListPage({
  searchParams
}: NewGroceryListPageProps = {}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const requestedSource = resolvedSearchParams?.source;
  const requestedWeek = resolvedSearchParams?.week;

  if (
    requestedSource === "meal-plan" &&
    typeof requestedWeek === "string"
  ) {
    const parsedWeek = parseIsoDate(requestedWeek);
    if (parsedWeek) {
      const weekStartDate = getWeekStart(parsedWeek);
      return (
        <NewGroceryList
          source="meal-plan"
          weekStartDate={weekStartDate}
        />
      );
    }
  }

  const source = requestedSource === "recipes" ? "recipes" : "blank";

  return <NewGroceryList source={source} />;
}
