export const AUTH_SEARCH_PARAM = "auth";

export const AUTH_MESSAGES = {
  "callback-error": "We could not finish signing you in. Please try again.",
  "check-email": "Check your email to confirm your account, then come back to sign in.",
  "google-error": "Google sign-in could not start. Please try again.",
  "invalid-credentials": "The email or password did not match.",
  "signed-out": "You have been signed out.",
  "signup-error": "We could not create your account. Please try again."
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;

export function getAuthMessage(messageKey?: string) {
  if (!messageKey) {
    return null;
  }

  return AUTH_MESSAGES[messageKey as AuthMessageKey] ?? null;
}
