"use client";

import { Chrome, KeyRound, Mail, RotateCw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppPageShell } from "@/components/ui/app-page-shell";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  resendConfirmationEmail,
  sendPasswordResetEmail,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail
} from "./auth.actions";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthHero } from "./auth-hero";
import type { AuthMode } from "./auth.constants";

type AuthPanelProps = {
  initialMode: AuthMode;
  message: string | null;
};

export function AuthPanel({ initialMode, message }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const isSignIn = mode === "sign-in";
  const isSignUp = mode === "sign-up";
  const title =
    mode === "reset" ? "Reset password" : mode === "resend" ? "Resend confirmation" : "Your private recipe shelf.";
  const formAction =
    mode === "reset"
      ? sendPasswordResetEmail
      : mode === "resend"
        ? resendConfirmationEmail
        : isSignIn
          ? signInWithEmail
          : signUpWithEmail;
  const submitLabel =
    mode === "reset"
      ? "Send reset link"
      : mode === "resend"
        ? "Resend confirmation"
        : isSignIn
          ? "Sign in with email"
          : "Create account";
  const pendingLabel =
    mode === "reset" ? "Sending link..." : mode === "resend" ? "Sending email..." : isSignIn ? "Signing in..." : "Creating...";

  return (
    <AppPageShell className="flex flex-col" spacing="compact">
      <section className="flex flex-1 flex-col justify-center">
        <AuthHero
          description="Save practical meals, keep them private, and build a library that fits your kitchen."
          title={title}
        />

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 rounded-lg bg-leaf-50 p-1 text-sm font-semibold">
            <button
              className={
                isSignIn ? "rounded-md bg-white px-3 py-2 text-leaf-700 shadow-sm" : "px-3 py-2 text-slate-500"
              }
              onClick={() => setMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={
                !isSignIn ? "rounded-md bg-white px-3 py-2 text-leaf-700 shadow-sm" : "px-3 py-2 text-slate-500"
              }
              onClick={() => setMode("sign-up")}
              type="button"
            >
              Create account
            </button>
          </div>

          {message ? (
            <InlineNotice className="mt-4" padding="slim" tone="info">
              {message}
            </InlineNotice>
          ) : null}

          <form action={formAction} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-leaf-700"
                name="email"
                required
                type="email"
              />
            </label>
            {mode === "sign-in" || mode === "sign-up" ? (
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-leaf-700"
                  minLength={6}
                  name="password"
                  required
                  type="password"
                />
              </label>
            ) : null}
            <AuthSubmitButton pendingLabel={pendingLabel}>
              {isSignIn ? <Mail className="h-4 w-4" aria-hidden="true" /> : isSignUp ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : mode === "reset" ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : <RotateCw className="h-4 w-4" aria-hidden="true" />}
              {submitLabel}
            </AuthSubmitButton>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-3">
            {mode === "reset" ? null : (
              <Link className="text-sm font-semibold text-leaf-700" href="/?mode=reset" onClick={() => setMode("reset")}>
                Forgot password?
              </Link>
            )}
            {mode === "resend" ? null : (
              <Link className="text-sm font-semibold text-leaf-700" href="/?mode=resend" onClick={() => setMode("resend")}>
                Resend confirmation
              </Link>
            )}
          </div>

          <form action={signInWithGoogle} className="mt-3">
            <AuthSubmitButton pendingLabel="Opening Google..." variant="secondary">
              <Chrome className="h-4 w-4" aria-hidden="true" />
              Continue with Google
            </AuthSubmitButton>
          </form>
        </div>
      </section>
    </AppPageShell>
  );
}
