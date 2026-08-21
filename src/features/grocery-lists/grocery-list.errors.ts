export class GroceryListNotFoundError extends Error {
  constructor() {
    super("This grocery list is unavailable.");
    this.name = "GroceryListNotFoundError";
  }
}

export class DuplicateGroceryListItemError extends Error {
  constructor() {
    super("That item is already on this list.");
    this.name = "DuplicateGroceryListItemError";
  }
}

export class GroceryListAuthenticationError extends Error {
  constructor() {
    super("Your session expired. Please sign in again.");
    this.name = "GroceryListAuthenticationError";
  }
}

export class GroceryListRecipeUnavailableError extends Error {
  constructor() {
    super("One selected recipe is no longer available. Review your selections and try again.");
    this.name = "GroceryListRecipeUnavailableError";
  }
}

export class GroceryListItemLimitError extends Error {
  constructor() {
    super(
      "This selection creates more than 300 grocery items. Remove a recipe or choose recipes with fewer ingredients."
    );
    this.name = "GroceryListItemLimitError";
  }
}

export type GroceryListErrorAction =
  | "create"
  | "delete"
  | "loadDetail"
  | "loadList"
  | "saveItem"
  | "update";

const FALLBACK_MESSAGES: Record<GroceryListErrorAction, string> = {
  create: "We could not create this grocery list. Please try again.",
  delete: "We could not delete this grocery list. Please try again.",
  loadDetail: "We could not load this grocery list. Please try again.",
  loadList: "We could not load your grocery lists. Please try again.",
  saveItem: "We could not save this grocery item. Please try again.",
  update: "We could not update this grocery list. Please try again."
};

type ErrorDetails = {
  code?: string;
  message: string;
  name?: string;
  status?: number;
};

function getErrorDetails(error: unknown): ErrorDetails {
  if (typeof error !== "object" || error === null) {
    return { message: typeof error === "string" ? error : "" };
  }

  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : "",
    name: typeof record.name === "string" ? record.name : undefined,
    status:
      typeof record.status === "number"
        ? record.status
        : typeof record.statusCode === "number"
          ? record.statusCode
          : undefined
  };
}

export function getGroceryListErrorMessage(
  error: unknown,
  action: GroceryListErrorAction
) {
  if (
    error instanceof GroceryListNotFoundError ||
    error instanceof DuplicateGroceryListItemError ||
    error instanceof GroceryListAuthenticationError ||
    error instanceof GroceryListRecipeUnavailableError ||
    error instanceof GroceryListItemLimitError
  ) {
    return error.message;
  }

  const details = getErrorDetails(error);
  const searchable = `${details.name ?? ""} ${details.code ?? ""} ${details.message}`.toLowerCase();

  if (
    details.status === 401 ||
    ["auth", "jwt", "session", "not authenticated", "unauthorized"].some(
      (value) => searchable.includes(value)
    )
  ) {
    return "Your session expired. Please sign in again.";
  }

  if (
    details.status === 403 ||
    details.code === "42501" ||
    ["row-level security", "permission denied", "forbidden"].some((value) =>
      searchable.includes(value)
    )
  ) {
    return action === "loadList" || action === "loadDetail"
      ? "This grocery list is unavailable."
      : "You do not have access to change this grocery list.";
  }

  if (
    details.name === "TypeError" ||
    details.status === 0 ||
    ["failed to fetch", "network", "connection", "timeout", "offline"].some(
      (value) => searchable.includes(value)
    )
  ) {
    return "Check your connection and try again.";
  }

  if (["23502", "23503", "23505", "23514", "22P02"].includes(details.code ?? "")) {
    return action === "saveItem"
      ? "Check the item details and try again."
      : "Check the list details and try again.";
  }

  return FALLBACK_MESSAGES[action];
}
