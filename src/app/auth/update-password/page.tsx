import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { updatePassword } from "@/features/auth/auth.actions";
import { AuthSubmitButton } from "@/features/auth/auth-submit-button";
import { AUTH_SEARCH_PARAM, getAuthMessage } from "@/features/auth/auth.constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UpdatePasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const resolvedSearchParams = await searchParams;
  const authMessageKey = resolvedSearchParams?.[AUTH_SEARCH_PARAM];
  const authMessage = getAuthMessage(Array.isArray(authMessageKey) ? authMessageKey[0] : authMessageKey);

  if (!user) {
    redirect("/?auth=callback-error");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[#fffdf8] px-5 py-8 shadow-sm">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="rounded-b-3xl bg-leaf-100 px-4 pb-6 pt-5">
          <p className="text-sm font-semibold text-leaf-700">PocketPlates</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Choose a new password.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use at least 6 characters. You will sign in again after the password is updated.
          </p>
        </div>

        {authMessage ? (
          <p className="mt-4 rounded-lg border border-leaf-100 bg-leaf-50 px-3 py-2 text-sm text-slate-700">
            {authMessage}
          </p>
        ) : null}

        <form action={updatePassword} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-leaf-700"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          <AuthSubmitButton pendingLabel="Updating password...">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Update password
          </AuthSubmitButton>
        </form>
      </section>
    </main>
  );
}
