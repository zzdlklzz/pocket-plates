import { AuthPanel } from "@/features/auth/auth-panel";
import { AUTH_MODE_SEARCH_PARAM, AUTH_SEARCH_PARAM, getAuthMessage, getAuthMode } from "@/features/auth/auth.constants";
import { RecipeLibrary } from "@/features/recipes/recipe-library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileSummary = {
  display_name: string | null;
  username: string | null;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const resolvedSearchParams = await searchParams;
  const authMessageKey = resolvedSearchParams?.[AUTH_SEARCH_PARAM];
  const authModeKey = resolvedSearchParams?.[AUTH_MODE_SEARCH_PARAM];
  const authMessage = getAuthMessage(Array.isArray(authMessageKey) ? authMessageKey[0] : authMessageKey);
  const authMode = getAuthMode(Array.isArray(authModeKey) ? authModeKey[0] : authModeKey);

  if (!user) {
    return <AuthPanel initialMode={authMode} key={authMode} message={authMessage} />;
  }

  const { data } = await supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle();
  const profile = data as ProfileSummary | null;
  const profileLabel = profile?.display_name ?? profile?.username ?? user.email ?? "PocketPlates cook";

  return <RecipeLibrary profileLabel={profileLabel} />;
}
