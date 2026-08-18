export const RECIPE_IMAGE_BUCKET = "recipe-images";
export const MAX_RECIPE_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
export const RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const RECIPE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RECIPE_IMAGE_ACCEPT = RECIPE_IMAGE_MIME_TYPES.join(",");

const RECIPE_IMAGE_EXTENSIONS: Record<(typeof RECIPE_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function getRecipeImageExtension(mimeType: string) {
  return RECIPE_IMAGE_EXTENSIONS[mimeType as keyof typeof RECIPE_IMAGE_EXTENSIONS] ?? null;
}

export function getRecipeImageValidationError(file: File) {
  if (!getRecipeImageExtension(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }

  if (file.size > MAX_RECIPE_IMAGE_FILE_SIZE) {
    return "Choose an image that is 2 MB or smaller.";
  }

  return null;
}
