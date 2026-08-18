import { describe, expect, it, vi } from "vitest";
import { RECIPE_IMAGE_BUCKET, RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS } from "../recipe-image.constants";
import {
  getRecipeImageUrl,
  getRecipeImageUrls,
  removeRecipeImage,
  uploadRecipeImage
} from "../recipe-image.repository";

describe("recipe image repository", () => {
  it("uses legacy URLs only when no storage path exists", async () => {
    const from = vi.fn();
    const supabase = { storage: { from } } as never;

    await expect(getRecipeImageUrl(supabase, null, "https://example.com/legacy.jpg")).resolves.toBe(
      "https://example.com/legacy.jpg"
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("creates a temporary URL for a private stored image", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
      error: null
    });
    const from = vi.fn(() => ({ createSignedUrl }));
    const supabase = { storage: { from } } as never;

    await expect(getRecipeImageUrl(supabase, "user-1/recipe-1/cover.webp", null)).resolves.toBe(
      "https://example.com/signed"
    );
    expect(from).toHaveBeenCalledWith(RECIPE_IMAGE_BUCKET);
    expect(createSignedUrl).toHaveBeenCalledWith(
      "user-1/recipe-1/cover.webp",
      RECIPE_IMAGE_SIGNED_URL_TTL_SECONDS
    );
  });

  it("creates private list URLs in one batch while preserving legacy fallbacks", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: "user-1/recipe-1/cover.webp", signedUrl: "https://example.com/signed-1" },
        { path: "user-1/recipe-2/cover.png", signedUrl: "https://example.com/signed-2" }
      ],
      error: null
    });
    const supabase = { storage: { from: vi.fn(() => ({ createSignedUrls })) } } as never;

    await expect(
      getRecipeImageUrls(supabase, [
        { legacyImageUrl: null, storagePath: "user-1/recipe-1/cover.webp" },
        { legacyImageUrl: "https://example.com/legacy.jpg", storagePath: null },
        { legacyImageUrl: null, storagePath: "user-1/recipe-2/cover.png" }
      ])
    ).resolves.toEqual([
      "https://example.com/signed-1",
      "https://example.com/legacy.jpg",
      "https://example.com/signed-2"
    ]);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("uploads into an owner and recipe scoped path and removes by path", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ remove, upload }));
    const supabase = { storage: { from } } as never;
    const randomUuid = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000000");
    const file = new File(["image"], "meal.png", { type: "image/png" });

    await expect(uploadRecipeImage(supabase, "user-1", "recipe-1", file)).resolves.toBe(
      "user-1/recipe-1/00000000-0000-4000-8000-000000000000.png"
    );
    expect(upload).toHaveBeenCalledWith(
      "user-1/recipe-1/00000000-0000-4000-8000-000000000000.png",
      file,
      { cacheControl: "3600", contentType: "image/png", upsert: false }
    );

    await removeRecipeImage(supabase, "user-1/recipe-1/cover.png");
    expect(remove).toHaveBeenCalledWith(["user-1/recipe-1/cover.png"]);
    randomUuid.mockRestore();
  });
});
