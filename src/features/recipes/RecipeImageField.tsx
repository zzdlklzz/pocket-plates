"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { RECIPE_IMAGE_ACCEPT, RECIPE_IMAGE_PROCESSING_ERROR } from "./recipe-image.constants";
import { processRecipeImage } from "./recipe-image.processor";
import type { RecipeImageChange } from "./recipe.types";

type RecipeImageFieldProps = {
  initialImageUrl?: string | null;
  onChange: (change: RecipeImageChange) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
};

export function RecipeImageField({
  initialImageUrl = null,
  onChange,
  onProcessingChange
}: RecipeImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const processingRequestRef = useRef(0);
  const selectedPreviewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      processingRequestRef.current += 1;
      if (selectedPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedPreviewUrlRef.current);
        selectedPreviewUrlRef.current = null;
      }
    };
  }, []);

  async function selectImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const requestId = processingRequestRef.current + 1;
    processingRequestRef.current = requestId;
    setError(null);
    setIsProcessing(true);
    onProcessingChange?.(true);

    try {
      const processedFile = await processRecipeImage(file);
      if (!isMountedRef.current || requestId !== processingRequestRef.current) {
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(processedFile);
      if (!isMountedRef.current || requestId !== processingRequestRef.current) {
        URL.revokeObjectURL(nextPreviewUrl);
        return;
      }

      if (selectedPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedPreviewUrlRef.current);
      }
      selectedPreviewUrlRef.current = nextPreviewUrl;

      setFileName(processedFile.name);
      setPreviewUrl(nextPreviewUrl);
      onChange({ file: processedFile, type: "replace" });
    } catch (processingError) {
      if (!isMountedRef.current || requestId !== processingRequestRef.current) {
        return;
      }

      setError(
        processingError instanceof Error
          ? processingError.message
          : RECIPE_IMAGE_PROCESSING_ERROR
      );
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } finally {
      if (isMountedRef.current && requestId === processingRequestRef.current) {
        setIsProcessing(false);
        onProcessingChange?.(false);
      }
    }
  }

  function removeImage() {
    setError(null);
    setFileName(null);
    if (selectedPreviewUrlRef.current) {
      URL.revokeObjectURL(selectedPreviewUrlRef.current);
      selectedPreviewUrlRef.current = null;
    }
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(initialImageUrl ? { type: "remove" } : { type: "keep" });
  }

  return (
    <section aria-busy={isProcessing} aria-labelledby={`${inputId}-heading`} className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800" id={`${inputId}-heading`}>
          Cover image
        </h2>
        <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP. Optimized before upload.</p>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-leaf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Recipe cover preview" className="aspect-[4/3] w-full object-cover" src={previewUrl} />
        </div>
      ) : null}

      {fileName ? <p className="truncate text-xs text-slate-500">Selected: {fileName}</p> : null}
      {isProcessing ? (
        <p aria-live="polite" className="text-xs font-medium text-slate-500" role="status">
          Processing image...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}

      <div className="flex gap-2">
        <label
          aria-disabled={isProcessing || undefined}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-leaf-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 ${
            isProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
          htmlFor={inputId}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {previewUrl ? "Replace image" : "Choose image"}
        </label>
        <input
          accept={RECIPE_IMAGE_ACCEPT}
          className="sr-only"
          disabled={isProcessing}
          id={inputId}
          onChange={(event) => void selectImage(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        {previewUrl ? (
          <ActionButton disabled={isProcessing} onClick={removeImage} type="button" variant="danger">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </ActionButton>
        ) : null}
      </div>
    </section>
  );
}
