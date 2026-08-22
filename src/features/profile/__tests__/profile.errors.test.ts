import { describe, expect, it } from "vitest";
import {
  getProfileErrorMessage,
  isUsernameTakenError,
  mapProfileError
} from "../profile.errors";

describe("profile errors", () => {
  it("maps uniqueness, checks, auth, permissions, and network errors safely", () => {
    const taken = mapProfileError({ code: "23505", message: "constraint details" }, "save");

    expect(taken.message).toBe("That username is already taken.");
    expect(isUsernameTakenError(taken)).toBe(true);
    expect(getProfileErrorMessage({ code: "23514" }, "save")).toContain(
      "fields need fixing"
    );
    expect(getProfileErrorMessage({ status: 401 }, "load")).toContain(
      "session expired"
    );
    expect(getProfileErrorMessage({ code: "42501" }, "save")).toContain(
      "access"
    );
    expect(getProfileErrorMessage(new TypeError("Failed to fetch"), "load")).toContain(
      "connection"
    );
  });

  it("does not expose unknown database details", () => {
    expect(
      getProfileErrorMessage(new Error("secret constraint name"), "save")
    ).toBe("We could not save your profile. Please try again.");
  });
});
