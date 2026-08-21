import { redirect } from "next/navigation";
import { NewGroceryList } from "@/features/grocery-lists/GroceryListLibrary";
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

  const requestedSource = (await searchParams)?.source;
  const source = requestedSource === "recipes" ? "recipes" : "blank";

  return <NewGroceryList source={source} />;
}
