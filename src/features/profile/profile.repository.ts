import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapProfileError,
  ProfileError,
  type ProfileErrorAction
} from "./profile.errors";
import { mapOwnProfile, OWN_PROFILE_SELECT } from "./profile.mappers";
import type {
  OwnProfileDto,
  OwnProfileRow,
  UpdateOwnProfileInput
} from "./profile.types";
import { parseProfileInput } from "./profile.validation";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

async function getAuthenticatedUserId(
  supabase: SupabaseBrowserClient,
  action: ProfileErrorAction
) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw mapProfileError(error, action);
  }

  if (!user) {
    throw new ProfileError("auth");
  }

  return user.id;
}

export async function getOwnProfile(
  supabase: SupabaseBrowserClient
): Promise<OwnProfileDto> {
  const userId = await getAuthenticatedUserId(supabase, "load");
  const { data, error } = await supabase
    .from("profiles")
    .select(OWN_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapProfileError(error, "load");
  }

  if (!data) {
    throw new ProfileError("unavailable");
  }

  return mapOwnProfile(data as OwnProfileRow);
}

export async function updateOwnProfile(
  supabase: SupabaseBrowserClient,
  input: UpdateOwnProfileInput
): Promise<OwnProfileDto> {
  const userId = await getAuthenticatedUserId(supabase, "save");
  let normalizedInput: UpdateOwnProfileInput;

  try {
    normalizedInput = parseProfileInput(input);
  } catch {
    throw new ProfileError("validation");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: normalizedInput.displayName,
      username: normalizedInput.username
    } as never)
    .eq("id", userId)
    .select(OWN_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw mapProfileError(error, "save");
  }

  if (!data) {
    throw new ProfileError("unavailable");
  }

  return mapOwnProfile(data as OwnProfileRow);
}
