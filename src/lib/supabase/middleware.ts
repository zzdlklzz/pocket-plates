import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ENV_KEYS, SUPABASE_PUBLIC_ENV } from "@/lib/env/env.constants";
import type { Database } from "./database.types";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSupabaseSession(request: NextRequest) {
  const { url, publishableKey } = SUPABASE_PUBLIC_ENV;

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_ENV_KEYS.url} or ${SUPABASE_ENV_KEYS.publishableKey}.`);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}
