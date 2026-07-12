type RecipeErrorAction = "archive" | "loadDetail" | "loadList" | "save";

const FALLBACK_MESSAGES: Record<RecipeErrorAction, string> = {
  archive: "We could not archive this recipe. Please try again.",
  loadDetail: "We could not load this recipe. Please try again.",
  loadList: "We could not load your recipes. Please try again.",
  save: "We could not save this recipe. Please try again."
};

const AUTH_MESSAGE = "Your session expired. Please sign in again.";
const NETWORK_MESSAGE = "Check your connection and try again.";
const PERMISSION_MESSAGE = "You do not have access to change this recipe.";
const STORAGE_MESSAGE = "The image could not be uploaded. Try a smaller image or a different file.";
const VALIDATION_MESSAGE = "Some fields need fixing before this recipe can be saved.";
const VIEW_DETAIL_PERMISSION_MESSAGE = "You do not have access to view this recipe.";
const VIEW_LIST_PERMISSION_MESSAGE = "You do not have access to view these recipes.";

type ErrorDetails = {
  code?: string;
  message: string;
  name?: string;
  status?: number;
};

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const errorRecord = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown };

    return {
      code: typeof errorRecord.code === "string" ? errorRecord.code : undefined,
      message: error.message,
      name: error.name,
      status:
        typeof errorRecord.status === "number"
          ? errorRecord.status
          : typeof errorRecord.statusCode === "number"
            ? errorRecord.statusCode
            : undefined
    };
  }

  if (typeof error === "object" && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    const message = typeof errorRecord.message === "string" ? errorRecord.message : "";

    return {
      code: typeof errorRecord.code === "string" ? errorRecord.code : undefined,
      message,
      name: typeof errorRecord.name === "string" ? errorRecord.name : undefined,
      status:
        typeof errorRecord.status === "number"
          ? errorRecord.status
          : typeof errorRecord.statusCode === "number"
            ? errorRecord.statusCode
            : undefined
    };
  }

  return { message: typeof error === "string" ? error : "" };
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function getRecipeErrorMessage(error: unknown, action: RecipeErrorAction) {
  const details = getErrorDetails(error);
  const searchableText = `${details.name ?? ""} ${details.code ?? ""} ${details.message}`.toLowerCase();

  if (
    details.status === 401 ||
    includesAny(searchableText, ["auth", "jwt", "session", "signed in", "not authenticated", "unauthorized"])
  ) {
    return AUTH_MESSAGE;
  }

  if (details.status === 403 || details.code === "42501" || includesAny(searchableText, ["row-level security", "permission denied", "forbidden"])) {
    if (action === "loadList") {
      return VIEW_LIST_PERMISSION_MESSAGE;
    }

    if (action === "loadDetail") {
      return VIEW_DETAIL_PERMISSION_MESSAGE;
    }

    return PERMISSION_MESSAGE;
  }

  if (details.status === 400 || details.status === 409 || ["23502", "23503", "23505", "23514", "22P02"].includes(details.code ?? "")) {
    return VALIDATION_MESSAGE;
  }

  if (includesAny(searchableText, ["storage", "bucket", "upload", "object size", "mime"])) {
    return STORAGE_MESSAGE;
  }

  if (
    details.name === "TypeError" ||
    details.status === 0 ||
    includesAny(searchableText, ["failed to fetch", "network", "connection", "timeout", "offline"])
  ) {
    return NETWORK_MESSAGE;
  }

  return FALLBACK_MESSAGES[action];
}
