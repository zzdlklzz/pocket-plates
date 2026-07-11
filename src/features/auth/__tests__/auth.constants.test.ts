import { describe, expect, it } from "vitest";
import { getAuthMessage, getAuthMode } from "../auth.constants";

describe("getAuthMessage", () => {
  it("returns known auth messages without exposing arbitrary query text", () => {
    expect(getAuthMessage("signed-out")).toBe("You have been signed out.");
    expect(getAuthMessage("password-reset-sent")).toBe("If that account exists, a password reset link is on its way.");
    expect(getAuthMessage("not-a-real-message")).toBeNull();
    expect(getAuthMessage()).toBeNull();
  });

  it("allows only known auth modes", () => {
    expect(getAuthMode("reset")).toBe("reset");
    expect(getAuthMode("resend")).toBe("resend");
    expect(getAuthMode("surprise")).toBe("sign-in");
    expect(getAuthMode()).toBe("sign-in");
  });
});
