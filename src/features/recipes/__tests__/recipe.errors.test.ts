import { describe, expect, it } from "vitest";
import { getRecipeErrorMessage } from "../recipe.errors";

describe("getRecipeErrorMessage", () => {
  it("maps auth and session errors to a sign-in message", () => {
    expect(getRecipeErrorMessage(new Error("You must be signed in to create a recipe."), "save")).toBe(
      "Your session expired. Please sign in again."
    );
    expect(getRecipeErrorMessage({ message: "JWT expired", status: 401 }, "loadList")).toBe(
      "Your session expired. Please sign in again."
    );
  });

  it("maps permission errors without exposing policy details", () => {
    const message = getRecipeErrorMessage(
      {
        code: "42501",
        message: 'new row violates row-level security policy for table "recipes"',
        status: 403
      },
      "save"
    );

    expect(message).toBe("You do not have access to change this recipe.");
    expect(message).not.toContain("row-level security");
    expect(message).not.toContain("recipes");
    expect(getRecipeErrorMessage({ message: "Forbidden", statusCode: 403 }, "loadList")).toBe(
      "You do not have access to view these recipes."
    );
  });

  it("maps constraint errors to a safe validation message", () => {
    expect(getRecipeErrorMessage({ code: "23514", message: "violates check constraint recipes_servings_check" }, "save")).toBe(
      "Some fields need fixing before this recipe can be saved."
    );
  });

  it("maps network errors to a connection message", () => {
    expect(getRecipeErrorMessage(new TypeError("Failed to fetch"), "loadList")).toBe("Check your connection and try again.");
  });

  it("keeps action-specific fallbacks for unknown errors", () => {
    expect(getRecipeErrorMessage(new Error("database details that should stay hidden"), "archive")).toBe(
      "We could not archive this recipe. Please try again."
    );
    expect(getRecipeErrorMessage(new Error("database details that should stay hidden"), "loadDetail")).toBe(
      "We could not load this recipe. Please try again."
    );
  });
});
