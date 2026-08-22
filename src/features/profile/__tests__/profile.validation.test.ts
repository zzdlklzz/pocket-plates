import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeDisplayName,
  normalizeUsername,
  profileFormSchema,
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from "../profile.validation";

describe("profile validation", () => {
  it("normalizes display names and usernames", () => {
    expect(normalizeDisplayName("  Dani   Lim  ")).toBe("Dani Lim");
    expect(normalizeUsername("  DlkL  ")).toBe("dlkl");
    expect(
      profileFormSchema.parse({
        displayName: "  Dani   Lim  ",
        username: "  DlkL  "
      })
    ).toEqual({ displayName: "Dani Lim", username: "dlkl" });
  });

  it("accepts both field length boundaries", () => {
    expect(
      profileFormSchema.safeParse({
        displayName: "D".repeat(DISPLAY_NAME_MAX_LENGTH),
        username: "a".repeat(USERNAME_MIN_LENGTH)
      }).success
    ).toBe(true);
    expect(
      profileFormSchema.safeParse({
        displayName: "D",
        username: "a".repeat(USERNAME_MAX_LENGTH)
      }).success
    ).toBe(true);
  });

  it.each([
    { displayName: "", username: "cook" },
    { displayName: "D".repeat(DISPLAY_NAME_MAX_LENGTH + 1), username: "cook" },
    { displayName: "Dani\nLim", username: "cook" },
    { displayName: "Dani", username: "ab" },
    { displayName: "Dani", username: "a".repeat(USERNAME_MAX_LENGTH + 1) },
    { displayName: "Dani", username: "dani-lim" },
    { displayName: "Dani", username: "dani lim" }
  ])("rejects invalid values %#", (input) => {
    expect(profileFormSchema.safeParse(input).success).toBe(false);
  });

  it.each(RESERVED_USERNAMES)("rejects reserved username %s", (username) => {
    expect(
      profileFormSchema.safeParse({ displayName: "Dani", username }).success
    ).toBe(false);
  });
});
