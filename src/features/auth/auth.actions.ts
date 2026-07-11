"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";

function getOrigin() {
  return headers().get("origin") ?? "http://localhost:3000";
}

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export async function signInWithEmail(formData: FormData) {
  const credentials = getCredentials(formData);

  if (!credentials) {
    redirect("/?auth=invalid-credentials");
  }

  const supabase = createSupabaseCookieClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect("/?auth=invalid-credentials");
  }

  redirect("/");
}

export async function signUpWithEmail(formData: FormData) {
  const credentials = getCredentials(formData);

  if (!credentials) {
    redirect("/?auth=signup-error");
  }

  const supabase = createSupabaseCookieClient();
  const { error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback`
    }
  });

  if (error) {
    redirect("/?auth=signup-error");
  }

  redirect("/?auth=check-email");
}

export async function signInWithGoogle() {
  const supabase = createSupabaseCookieClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getOrigin()}/auth/callback`
    }
  });

  if (error || !data.url) {
    redirect("/?auth=google-error");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = createSupabaseCookieClient();
  await supabase.auth.signOut();

  redirect("/?auth=signed-out");
}
