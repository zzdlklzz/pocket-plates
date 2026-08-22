import { z } from "zod";
import type { UpdateOwnProfileInput } from "./profile.types";

export const DISPLAY_NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "support",
  "help",
  "pocketplates",
  "pocket_plates"
] as const;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const USERNAME_PATTERN = /^[a-z0-9_]+$/u;

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

const displayNameSchema = z
  .string()
  .refine(
    (value) => !CONTROL_CHARACTER_PATTERN.test(value),
    "Display name cannot contain control characters."
  )
  .transform(normalizeDisplayName)
  .pipe(
    z
      .string()
      .min(1, "Add a display name.")
      .max(
        DISPLAY_NAME_MAX_LENGTH,
        `Keep the display name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`
      )
  );

const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(
        USERNAME_MIN_LENGTH,
        `Use at least ${USERNAME_MIN_LENGTH} characters for the username.`
      )
      .max(
        USERNAME_MAX_LENGTH,
        `Keep the username to ${USERNAME_MAX_LENGTH} characters or fewer.`
      )
      .regex(
        USERNAME_PATTERN,
        "Use only lowercase letters, numbers, and underscores."
      )
      .refine(
        (value) => !RESERVED_USERNAMES.includes(value as (typeof RESERVED_USERNAMES)[number]),
        "Choose a different username."
      )
  );

export const profileFormSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema
}) satisfies z.ZodType<UpdateOwnProfileInput>;

export function parseProfileInput(input: UpdateOwnProfileInput) {
  return profileFormSchema.parse(input);
}
