import { redirect } from "next/navigation";
import { GroceryListLibrary } from "@/features/grocery-lists/GroceryListLibrary";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GroceryListsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <GroceryListLibrary />;
}
