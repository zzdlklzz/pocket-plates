import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { updatePassword } from "@/features/auth/auth.actions";
import { AuthHero } from "@/features/auth/AuthHero";
import { AuthSubmitButton } from "@/features/auth/AuthSubmitButton";
import { AUTH_SEARCH_PARAM, getAuthMessage } from "@/features/auth/auth.constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    <AppPageShell className="flex flex-col justify-center" spacing="compact">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <AuthHero
          description="Use at least 6 characters. You will sign in again after the password is updated."
          title="Choose a new password."
        />

        {authMessage ? (
          <InlineNotice className="mt-4" padding="slim" tone="info">
            {authMessage}
          </InlineNotice>
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
    </AppPageShell>
  );
}
