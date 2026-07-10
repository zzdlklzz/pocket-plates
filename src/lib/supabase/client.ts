import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ENV_KEYS } from "@/lib/env/env.constants";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const url = process.env[SUPABASE_ENV_KEYS.url];
  const anonKey = process.env[SUPABASE_ENV_KEYS.anonKey];

  if (!url || !anonKey) {
    throw new Error(`Missing ${SUPABASE_ENV_KEYS.url} or ${SUPABASE_ENV_KEYS.anonKey}.`);
  }

  return createBrowserClient<Database>(url, anonKey);
}
