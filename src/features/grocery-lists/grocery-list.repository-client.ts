import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GroceryListAuthenticationError } from "./grocery-list.errors";

export type SupabaseBrowserClient = ReturnType<
  typeof createSupabaseBrowserClient
>;

export function getGroceryListDatabaseError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { code: "", message: "" };
  }

  const errorRecord = error as { code?: unknown; message?: unknown };
  return {
    code: String(errorRecord.code ?? ""),
    message: String(errorRecord.message ?? "").toLowerCase()
  };
}

export async function getAuthenticatedGroceryListOwnerId(
  supabase: SupabaseBrowserClient
) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new GroceryListAuthenticationError();
  }

  return user.id;
}
