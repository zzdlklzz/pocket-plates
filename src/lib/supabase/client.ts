import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ENV_KEYS, SUPABASE_PUBLIC_ENV } from "@/lib/env/env.constants";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = SUPABASE_PUBLIC_ENV;

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_ENV_KEYS.url} or ${SUPABASE_ENV_KEYS.publishableKey}.`);
  }

  return createBrowserClient<Database>(url, publishableKey);
}
