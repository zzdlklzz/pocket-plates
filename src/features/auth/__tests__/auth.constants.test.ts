import { describe, expect, it } from "vitest";
import { getAuthMessage } from "../auth.constants";

describe("getAuthMessage", () => {
  it("returns known auth messages without exposing arbitrary query text", () => {
    expect(getAuthMessage("signed-out")).toBe("You have been signed out.");
    expect(getAuthMessage("not-a-real-message")).toBeNull();
    expect(getAuthMessage()).toBeNull();
  });
});
