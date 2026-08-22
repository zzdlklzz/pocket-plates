"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { BackLink } from "@/components/ui/BackLink";
import { InlineNotice } from "@/components/ui/InlineNotice";
import {
  getProfileErrorMessage,
  isUsernameTakenError
} from "./profile.errors";
import { mapProfileToFormValues } from "./profile.mappers";
import { useOwnProfile, useUpdateOwnProfile } from "./profile.queries";
import { ProfileEditorSkeleton } from "./profile-skeletons";
import type { UpdateOwnProfileInput } from "./profile.types";
import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeUsername,
  profileFormSchema,
  USERNAME_MAX_LENGTH
} from "./profile.validation";

const EMPTY_PROFILE: UpdateOwnProfileInput = {
  displayName: "",
  username: ""
};

export function ProfileEditor() {
  const profileQuery = useOwnProfile();
  const updateProfile = useUpdateOwnProfile();
  const [saved, setSaved] = useState(false);
  const form = useForm<UpdateOwnProfileInput>({
    defaultValues: EMPTY_PROFILE,
    resolver: zodResolver(profileFormSchema)
  });
  const username = normalizeUsername(
    useWatch({ control: form.control, name: "username" }) ?? ""
  );

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(mapProfileToFormValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  if (profileQuery.isPending) {
    return <ProfileEditorSkeleton />;
  }

  if (profileQuery.error) {
    return (
      <AppPageShell spacing="compact">
        <BackLink href="/">Back</BackLink>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Profile</h1>
        <InlineNotice className="mt-5" role="alert" tone="error">
          {getProfileErrorMessage(profileQuery.error, "load")}
        </InlineNotice>
        <ActionButton
          className="mt-4"
          onClick={() => void profileQuery.refetch()}
          variant="secondary"
        >
          Try again
        </ActionButton>
      </AppPageShell>
    );
  }

  async function onSubmit(values: UpdateOwnProfileInput) {
    if (updateProfile.isPending) {
      return;
    }

    setSaved(false);
    form.clearErrors("username");

    try {
      const profile = await updateProfile.mutateAsync(values);
      form.reset(mapProfileToFormValues(profile));
      setSaved(true);
    } catch (error) {
      if (isUsernameTakenError(error)) {
        form.setError(
          "username",
          { message: getProfileErrorMessage(error, "save"), type: "server" },
          { shouldFocus: true }
        );
        window.requestAnimationFrame(() => form.setFocus("username"));
      }
    }
  }

  const displayNameError = form.formState.errors.displayName?.message;
  const usernameError = form.formState.errors.username?.message;
  const pageSaveError =
    updateProfile.error && !isUsernameTakenError(updateProfile.error)
      ? getProfileErrorMessage(updateProfile.error, "save")
      : null;

  return (
    <AppPageShell spacing="compact">
      <BackLink href="/">Back</BackLink>

      <header className="mt-6 rounded-2xl bg-leaf-50 px-4 py-5">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          Your community identity
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Set the name people will see on recipes you choose to publish.
        </p>
      </header>

      {saved ? (
        <InlineNotice aria-live="polite" className="mt-5" role="status" tone="info">
          Profile saved
        </InlineNotice>
      ) : null}

      <form
        aria-busy={updateProfile.isPending}
        className="mt-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <fieldset
          className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-80"
          disabled={updateProfile.isPending}
        >
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              htmlFor="display-name"
            >
              Display name
            </label>
            <input
              aria-describedby={displayNameError ? "display-name-error" : undefined}
              aria-invalid={Boolean(displayNameError)}
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-leaf-700"
              id="display-name"
              maxLength={DISPLAY_NAME_MAX_LENGTH + 20}
              {...form.register("displayName", {
                onChange: () => setSaved(false)
              })}
            />
            {displayNameError ? (
              <p className="mt-2 text-sm text-red-700" id="display-name-error">
                {displayNameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
              htmlFor="username"
            >
              Username
            </label>
            <input
              aria-describedby={
                usernameError ? "username-error username-hint" : "username-hint"
              }
              aria-invalid={Boolean(usernameError)}
              autoCapitalize="none"
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-leaf-700"
              id="username"
              maxLength={USERNAME_MAX_LENGTH + 20}
              spellCheck={false}
              {...form.register("username", {
                onChange: () => setSaved(false)
              })}
            />
            {usernameError ? (
              <p className="mt-2 text-sm text-red-700" id="username-error">
                {usernameError}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500" id="username-hint">
              Shown publicly as @{username || "your_username"}
            </p>
          </div>

          {pageSaveError ? (
            <InlineNotice role="alert" tone="error">
              {pageSaveError}
            </InlineNotice>
          ) : null}

          <ActionButton
            fullWidth
            pending={updateProfile.isPending}
            pendingLabel="Saving..."
            type="submit"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save profile
          </ActionButton>
        </fieldset>
      </form>

      <aside className="mt-8 flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-800">Your email stays private</p>
          <p className="mt-1">
            No avatar, biography, or public profile page is needed.
          </p>
        </div>
      </aside>
    </AppPageShell>
  );
}
