export const AUTH_SEARCH_PARAM = "auth";
export const AUTH_MODE_SEARCH_PARAM = "mode";

export const AUTH_MODES = ["sign-in", "sign-up", "reset", "resend"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const AUTH_MESSAGES = {
  "callback-error": "We could not finish signing you in. Please try again.",
  "check-email": "Check your email to confirm your account, then come back to sign in.",
  "confirmation-resent": "If that email is waiting for confirmation, we sent the link again.",
  "google-error": "Google sign-in could not start. Please try again.",
  "invalid-credentials": "The email or password did not match.",
  "password-reset-error": "We could not send a reset link. Please check the email and try again.",
  "password-reset-sent": "If that account exists, a password reset link is on its way.",
  "password-update-error": "We could not update your password. Please try the reset link again.",
  "password-updated": "Your password has been updated. Please sign in with the new password.",
  "resend-error": "We could not resend the confirmation email. Please try again.",
  "signed-out": "You have been signed out.",
  "signup-error": "We could not create your account. Please try again."
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;

export function getAuthMode(modeKey?: string): AuthMode {
  return AUTH_MODES.includes(modeKey as AuthMode) ? (modeKey as AuthMode) : "sign-in";
}

export function getAuthMessage(messageKey?: string) {
  if (!messageKey) {
    return null;
  }

  return AUTH_MESSAGES[messageKey as AuthMessageKey] ?? null;
}
