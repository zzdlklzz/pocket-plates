export type ProfileErrorAction = "load" | "save";
export type ProfileErrorKind =
  | "auth"
  | "load"
  | "network"
  | "permission"
  | "save"
  | "unavailable"
  | "username-taken"
  | "validation";

const PROFILE_ERROR_MESSAGES: Record<ProfileErrorKind, string> = {
  auth: "Your session expired. Please sign in again.",
  load: "We could not load your profile. Please try again.",
  network: "Check your connection and try again.",
  permission: "You do not have access to change this profile.",
  save: "We could not save your profile. Please try again.",
  unavailable: "Your profile is unavailable. Please sign out and try again.",
  "username-taken": "That username is already taken.",
  validation: "Some profile fields need fixing before they can be saved."
};

export class ProfileError extends Error {
  constructor(readonly kind: ProfileErrorKind) {
    super(PROFILE_ERROR_MESSAGES[kind]);
    this.name = "ProfileError";
  }
}

function getErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { code: undefined, message: String(error ?? ""), status: undefined };
  }

  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : "",
    status:
      typeof record.status === "number"
        ? record.status
        : typeof record.statusCode === "number"
          ? record.statusCode
          : undefined
  };
}

export function mapProfileError(
  error: unknown,
  action: ProfileErrorAction
): ProfileError {
  if (error instanceof ProfileError) {
    return error;
  }

  const { code, message, status } = getErrorDetails(error);
  const searchable = `${code ?? ""} ${message}`.toLowerCase();

  if (code === "23505") {
    return new ProfileError("username-taken");
  }

  if (code === "23514") {
    return new ProfileError("validation");
  }

  if (
    status === 401 ||
    searchable.includes("jwt") ||
    searchable.includes("session") ||
    searchable.includes("not authenticated")
  ) {
    return new ProfileError("auth");
  }

  if (
    code === "42501" ||
    status === 403 ||
    searchable.includes("row-level security") ||
    searchable.includes("permission denied")
  ) {
    return new ProfileError("permission");
  }

  if (
    error instanceof TypeError ||
    status === 0 ||
    ["failed to fetch", "network", "connection", "timeout", "offline"].some(
      (value) => searchable.includes(value)
    )
  ) {
    return new ProfileError("network");
  }

  return new ProfileError(action);
}

export function getProfileErrorMessage(
  error: unknown,
  action: ProfileErrorAction
) {
  return mapProfileError(error, action).message;
}

export function isUsernameTakenError(error: unknown) {
  return (
    error instanceof ProfileError && error.kind === "username-taken"
  );
}
