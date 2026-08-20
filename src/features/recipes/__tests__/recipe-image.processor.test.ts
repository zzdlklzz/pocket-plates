import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RECIPE_IMAGE_FILE_SIZE,
  RECIPE_IMAGE_PROCESSING_ERROR,
  RECIPE_IMAGE_TOO_LARGE_ERROR,
  RECIPE_IMAGE_UNSUPPORTED_TYPE_ERROR
} from "../recipe-image.constants";
import { processRecipeImage } from "../recipe-image.processor";

type BitmapStub = Pick<ImageBitmap, "close" | "height" | "width">;

const drawImage = vi.fn();
const close = vi.fn();
let exportedBlob = new Blob(["processed"], { type: "image/webp" });
let canvas: HTMLCanvasElement;

beforeEach(() => {
  vi.clearAllMocks();
  exportedBlob = new Blob(["processed"], { type: "image/webp" });
  canvas = document.createElement("canvas");
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ close, height: 1200, width: 2400 }) satisfies BitmapStub)
  );
  vi.spyOn(document, "createElement").mockReturnValue(canvas);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(exportedBlob));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("processRecipeImage", () => {
  it("resizes a landscape image to the longest-edge limit and exports WebP", async () => {
    const source = new File([new Uint8Array(MAX_RECIPE_IMAGE_FILE_SIZE + 1)], "dinner.jpg", {
      type: "image/jpeg"
    });

    const result = await processRecipeImage(source);

    expect(createImageBitmap).toHaveBeenCalledWith(source, { imageOrientation: "from-image" });
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
    expect(result.name).toBe("dinner.webp");
    expect(result.type).toBe("image/webp");
    expect(result.size).toBe(exportedBlob.size);
    expect(close).toHaveBeenCalledOnce();
  });

  it.each([
    { height: 2400, outputHeight: 1600, outputWidth: 800, width: 1200 },
    { height: 600, outputHeight: 600, outputWidth: 800, width: 800 }
  ])("keeps aspect ratio without enlargement for $width x $height", async (dimensions) => {
    vi.mocked(createImageBitmap).mockResolvedValue({ close, height: dimensions.height, width: dimensions.width } as ImageBitmap);

    await processRecipeImage(new File(["image"], "meal.png", { type: "image/png" }));

    expect(canvas.width).toBe(dimensions.outputWidth);
    expect(canvas.height).toBe(dimensions.outputHeight);
  });

  it("rejects an oversized processed result", async () => {
    exportedBlob = new Blob([new Uint8Array(MAX_RECIPE_IMAGE_FILE_SIZE + 1)], { type: "image/webp" });

    await expect(processRecipeImage(new File(["image"], "meal.jpg", { type: "image/jpeg" }))).rejects.toThrow(
      RECIPE_IMAGE_TOO_LARGE_ERROR
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects unsupported input before decoding", async () => {
    await expect(processRecipeImage(new File(["image"], "meal.svg", { type: "image/svg+xml" }))).rejects.toThrow(
      RECIPE_IMAGE_UNSUPPORTED_TYPE_ERROR
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("returns a safe error and releases resources when processing fails", async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new DOMException("The source image could not be decoded."));

    await expect(processRecipeImage(new File(["broken"], "meal.jpg", { type: "image/jpeg" }))).rejects.toThrow(
      RECIPE_IMAGE_PROCESSING_ERROR
    );
    expect(close).not.toHaveBeenCalled();
  });
});
