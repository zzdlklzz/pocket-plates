export const RECIPE_IMAGE_BUCKET = "recipe-images";
export const MAX_RECIPE_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_RECIPE_IMAGE_EDGE = 1600;
export const RECIPE_IMAGE_OUTPUT_MIME_TYPE = "image/webp";
export const RECIPE_IMAGE_OUTPUT_QUALITY = 0.82;
export const RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const RECIPE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RECIPE_IMAGE_ACCEPT = RECIPE_IMAGE_MIME_TYPES.join(",");
export const RECIPE_IMAGE_UNSUPPORTED_TYPE_ERROR = "Choose a JPEG, PNG, or WebP image.";
export const RECIPE_IMAGE_TOO_LARGE_ERROR = "The processed image must be 2 MB or smaller.";
export const RECIPE_IMAGE_PROCESSING_ERROR = "We couldn't process that image. Try a different file.";

const RECIPE_IMAGE_EXTENSIONS: Record<(typeof RECIPE_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function getRecipeImageExtension(mimeType: string) {
  return RECIPE_IMAGE_EXTENSIONS[mimeType as keyof typeof RECIPE_IMAGE_EXTENSIONS] ?? null;
}

export function getRecipeImageSourceValidationError(file: File) {
  if (!getRecipeImageExtension(file.type)) {
    return RECIPE_IMAGE_UNSUPPORTED_TYPE_ERROR;
  }

  return null;
}

export function getRecipeImageUploadValidationError(file: File) {
  const sourceValidationError = getRecipeImageSourceValidationError(file);
  if (sourceValidationError) {
    return sourceValidationError;
  }

  if (file.size > MAX_RECIPE_IMAGE_FILE_SIZE) {
    return RECIPE_IMAGE_TOO_LARGE_ERROR;
  }

  return null;
}
