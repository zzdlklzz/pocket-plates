"use client";

import { useState } from "react";
import { Chrome, Mail, UserPlus } from "lucide-react";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "./auth.actions";

type AuthMode = "sign-in" | "sign-up";

type AuthPanelProps = {
  message: string | null;
};

export function AuthPanel({ message }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const isSignIn = mode === "sign-in";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-[#fffdf8] px-5 py-8 shadow-sm">
      <section className="flex flex-1 flex-col justify-center">
        <div className="rounded-b-3xl bg-leaf-100 px-4 pb-6 pt-5">
          <p className="text-sm font-semibold text-leaf-700">PocketPlates</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Your private recipe shelf.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Save practical meals, keep them private, and build a library that fits your kitchen.
          </p>
        </div>

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
            <p className="mt-4 rounded-lg border border-leaf-100 bg-leaf-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </p>
          ) : null}

          <form action={isSignIn ? signInWithEmail : signUpWithEmail} className="mt-4 space-y-3">
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
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              {isSignIn ? <Mail className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              {isSignIn ? "Sign in with email" : "Create account"}
            </button>
          </form>

          <form action={signInWithGoogle} className="mt-3">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              type="submit"
            >
              <Chrome className="h-4 w-4" aria-hidden="true" />
              Continue with Google
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
