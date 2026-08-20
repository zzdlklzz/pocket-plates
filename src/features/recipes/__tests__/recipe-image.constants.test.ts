import { describe, expect, it } from "vitest";
import {
  getRecipeImageExtension,
  getRecipeImageSourceValidationError,
  getRecipeImageUploadValidationError,
  MAX_RECIPE_IMAGE_FILE_SIZE,
  RECIPE_IMAGE_TOO_LARGE_ERROR
} from "../recipe-image.constants";

describe("recipe image validation", () => {
  it("accepts the supported image formats", () => {
    expect(getRecipeImageExtension("image/jpeg")).toBe("jpg");
    expect(getRecipeImageExtension("image/png")).toBe("png");
    expect(getRecipeImageExtension("image/webp")).toBe("webp");
    expect(getRecipeImageSourceValidationError(new File(["image"], "meal.webp", { type: "image/webp" }))).toBeNull();
    expect(getRecipeImageUploadValidationError(new File(["image"], "meal.webp", { type: "image/webp" }))).toBeNull();
  });

  it("rejects unsupported source formats without limiting the original size", () => {
    expect(getRecipeImageSourceValidationError(new File(["image"], "meal.svg", { type: "image/svg+xml" }))).toBe(
      "Choose a JPEG, PNG, or WebP image."
    );
    expect(
      getRecipeImageSourceValidationError(
        new File([new Uint8Array(MAX_RECIPE_IMAGE_FILE_SIZE + 1)], "large.jpg", { type: "image/jpeg" })
      )
    ).toBeNull();
  });

  it("keeps the 2 MB hard limit for processed uploads", () => {
    expect(
      getRecipeImageUploadValidationError(
        new File([new Uint8Array(MAX_RECIPE_IMAGE_FILE_SIZE + 1)], "large.jpg", { type: "image/jpeg" })
      )
    ).toBe(RECIPE_IMAGE_TOO_LARGE_ERROR);
  });
});
