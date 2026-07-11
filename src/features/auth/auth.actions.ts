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

function getEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return null;
  }

  return email;
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

export async function resendConfirmationEmail(formData: FormData) {
  const email = getEmail(formData);

  if (!email) {
    redirect("/?auth=resend-error");
  }

  const supabase = createSupabaseCookieClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback`
    }
  });

  if (error) {
    redirect("/?auth=resend-error");
  }

  redirect("/?auth=confirmation-resent");
}

export async function sendPasswordResetEmail(formData: FormData) {
  const email = getEmail(formData);

  if (!email) {
    redirect("/?auth=password-reset-error");
  }

  const supabase = createSupabaseCookieClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/auth/update-password`
  });

  if (error) {
    redirect("/?auth=password-reset-error");
  }

  redirect("/?auth=password-reset-sent");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    redirect("/auth/update-password?auth=password-update-error");
  }

  const supabase = createSupabaseCookieClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/auth/update-password?auth=password-update-error");
  }

  await supabase.auth.signOut();
  redirect("/?auth=password-updated");
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
