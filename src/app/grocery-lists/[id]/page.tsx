import { redirect } from "next/navigation";
import { GroceryListDetail } from "@/features/grocery-lists/GroceryListDetail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GroceryListDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroceryListDetailPage({
  params
}: GroceryListDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  return <GroceryListDetail id={id} />;
}
