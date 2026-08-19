import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getRecipeImageExtension,
  getRecipeImageValidationError,
  RECIPE_IMAGE_BUCKET,
  RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS
} from "./recipe-image.constants";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export async function getRecipeImageUrl(
  supabase: SupabaseBrowserClient,
  storagePath: string | null,
  legacyImageUrl: string | null
) {
  if (!storagePath) {
    return legacyImageUrl;
  }

  const { data, error } = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .createSignedUrl(storagePath, RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

type RecipeImageReference = {
  legacyImageUrl: string | null;
  storagePath: string | null;
};

export async function getRecipeImageUrls(
  supabase: SupabaseBrowserClient,
  references: RecipeImageReference[]
) {
  const storagePaths = Array.from(
    new Set(references.flatMap(({ storagePath }) => (storagePath ? [storagePath] : [])))
  );

  if (storagePaths.length === 0) {
    return references.map(({ legacyImageUrl }) => legacyImageUrl);
  }

  const { data, error } = await supabase.storage
    .from(RECIPE_IMAGE_BUCKET)
    .createSignedUrls(storagePaths, RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  const signedUrls = new Map(data.map(({ path, signedUrl }) => [path, signedUrl]));
  return references.map(({ legacyImageUrl, storagePath }) =>
    storagePath ? (signedUrls.get(storagePath) ?? null) : legacyImageUrl
  );
}

export async function uploadRecipeImage(
  supabase: SupabaseBrowserClient,
  ownerId: string,
  recipeId: string,
  file: File
) {
  const validationError = getRecipeImageValidationError(file);
  const extension = getRecipeImageExtension(file.type);

  if (validationError || !extension) {
    throw new Error(validationError ?? "The recipe image type is not supported.");
  }

  const storagePath = `${ownerId}/${recipeId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(RECIPE_IMAGE_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw error;
  }

  return storagePath;
}

export async function removeRecipeImage(supabase: SupabaseBrowserClient, storagePath: string) {
  return removeRecipeImages(supabase, [storagePath]);
}

export async function removeRecipeImages(supabase: SupabaseBrowserClient, storagePaths: string[]) {
  const uniqueStoragePaths = Array.from(new Set(storagePaths));

  if (uniqueStoragePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(RECIPE_IMAGE_BUCKET).remove(uniqueStoragePaths);

  if (error) {
    throw error;
  }
}
