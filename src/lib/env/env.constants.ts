export const SUPABASE_ENV_KEYS = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  secretKey: "SUPABASE_SECRET_KEY"
} as const;

const SUPABASE_PUBLIC_ENV = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
} as const;

export function getSupabasePublicConfig() {
  const { url, publishableKey } = SUPABASE_PUBLIC_ENV;

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_ENV_KEYS.url} or ${SUPABASE_ENV_KEYS.publishableKey}.`);
  }

  return { url, publishableKey };
}
