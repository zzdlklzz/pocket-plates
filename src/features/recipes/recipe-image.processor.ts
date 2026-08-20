import {
  getRecipeImageSourceValidationError,
  getRecipeImageUploadValidationError,
  MAX_RECIPE_IMAGE_EDGE,
  RECIPE_IMAGE_OUTPUT_MIME_TYPE,
  RECIPE_IMAGE_OUTPUT_QUALITY,
  RECIPE_IMAGE_PROCESSING_ERROR
} from "./recipe-image.constants";

class ProcessedImageValidationError extends Error {}

function getOutputDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_RECIPE_IMAGE_EDGE / Math.max(width, height));

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale))
  };
}

function exportCanvas(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob?.type === RECIPE_IMAGE_OUTPUT_MIME_TYPE) {
          resolve(blob);
          return;
        }

        reject(new Error("WebP export failed."));
      },
      RECIPE_IMAGE_OUTPUT_MIME_TYPE,
      RECIPE_IMAGE_OUTPUT_QUALITY
    );
  });
}

function getOutputFileName(sourceName: string) {
  const extensionIndex = sourceName.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? sourceName.slice(0, extensionIndex) : sourceName;
  return `${baseName || "recipe-image"}.webp`;
}

export async function processRecipeImage(file: File): Promise<File> {
  const sourceValidationError = getRecipeImageSourceValidationError(file);
  if (sourceValidationError) {
    throw new Error(sourceValidationError);
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const dimensions = getOutputDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    const blob = await exportCanvas(canvas);
    const processedFile = new File([blob], getOutputFileName(file.name), {
      type: RECIPE_IMAGE_OUTPUT_MIME_TYPE
    });
    const uploadValidationError = getRecipeImageUploadValidationError(processedFile);

    if (uploadValidationError) {
      throw new ProcessedImageValidationError(uploadValidationError);
    }

    return processedFile;
  } catch (error) {
    if (error instanceof ProcessedImageValidationError) {
      throw error;
    }

    throw new Error(RECIPE_IMAGE_PROCESSING_ERROR);
  } finally {
    bitmap?.close();
  }
}
