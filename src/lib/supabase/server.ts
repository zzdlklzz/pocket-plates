import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ENV_KEYS, SUPABASE_PUBLIC_ENV } from "@/lib/env/env.constants";
import type { Database } from "./database.types";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function getSupabaseConfig() {
  const { url, publishableKey } = SUPABASE_PUBLIC_ENV;

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_ENV_KEYS.url} or ${SUPABASE_ENV_KEYS.publishableKey}.`);
  }

  return { url, publishableKey };
}

export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      }
    }
  });
}

export async function createSupabaseCookieClient() {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}
