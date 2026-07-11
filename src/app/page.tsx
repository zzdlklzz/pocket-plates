import { AuthPanel } from "@/features/auth/auth-panel";
import { AUTH_MODE_SEARCH_PARAM, AUTH_SEARCH_PARAM, getAuthMessage, getAuthMode } from "@/features/auth/auth.constants";
import { RecipeLibrary } from "@/features/recipes/recipe-library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type ProfileSummary = {
  display_name: string | null;
  username: string | null;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const authMessageKey = searchParams?.[AUTH_SEARCH_PARAM];
  const authModeKey = searchParams?.[AUTH_MODE_SEARCH_PARAM];
  const authMessage = getAuthMessage(Array.isArray(authMessageKey) ? authMessageKey[0] : authMessageKey);
  const authMode = getAuthMode(Array.isArray(authModeKey) ? authModeKey[0] : authModeKey);

  if (!user) {
    return <AuthPanel initialMode={authMode} message={authMessage} />;
  }

  const { data } = await supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle();
  const profile = data as ProfileSummary | null;
  const profileLabel = profile?.display_name ?? profile?.username ?? user.email ?? "PocketPlates cook";

  return <RecipeLibrary profileLabel={profileLabel} />;
}
