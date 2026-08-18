import { describe, expect, it } from "vitest";
import {
  getRecipeImageExtension,
  getRecipeImageValidationError,
  MAX_RECIPE_IMAGE_FILE_SIZE
} from "../recipe-image.constants";

describe("recipe image validation", () => {
  it("accepts the supported image formats", () => {
    expect(getRecipeImageExtension("image/jpeg")).toBe("jpg");
    expect(getRecipeImageExtension("image/png")).toBe("png");
    expect(getRecipeImageExtension("image/webp")).toBe("webp");
    expect(getRecipeImageValidationError(new File(["image"], "meal.webp", { type: "image/webp" }))).toBeNull();
  });

  it("rejects unsupported formats and files over 2 MB", () => {
    expect(getRecipeImageValidationError(new File(["image"], "meal.svg", { type: "image/svg+xml" }))).toBe(
      "Choose a JPEG, PNG, or WebP image."
    );
    expect(
      getRecipeImageValidationError(
        new File([new Uint8Array(MAX_RECIPE_IMAGE_FILE_SIZE + 1)], "large.jpg", { type: "image/jpeg" })
      )
    ).toBe("Choose an image that is 2 MB or smaller.");
  });
});
