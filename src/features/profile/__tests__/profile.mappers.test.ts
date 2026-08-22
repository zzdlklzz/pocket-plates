import { describe, expect, it } from "vitest";
import { mapOwnProfile, mapProfileToFormValues } from "../profile.mappers";

describe("profile mappers", () => {
  it("maps only the explicit public-identity fields", () => {
    expect(
      mapOwnProfile({ display_name: "Dani Lim", username: "dlkl" })
    ).toEqual({ displayName: "Dani Lim", username: "dlkl" });
  });

  it("maps incomplete profiles to empty form fields", () => {
    expect(mapProfileToFormValues({ displayName: null, username: null })).toEqual(
      { displayName: "", username: "" }
    );
  });
});
