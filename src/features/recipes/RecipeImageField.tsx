"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  getRecipeImageValidationError,
  RECIPE_IMAGE_ACCEPT
} from "./recipe-image.constants";
import type { RecipeImageChange } from "./recipe.types";

type RecipeImageFieldProps = {
  initialImageUrl?: string | null;
  onChange: (change: RecipeImageChange) => void;
};

export function RecipeImageField({ initialImageUrl = null, onChange }: RecipeImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  function selectImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const validationError = getRecipeImageValidationError(file);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setError(null);
    setFileName(file.name);
    setSelectedPreviewUrl(nextPreviewUrl);
    setPreviewUrl(nextPreviewUrl);
    onChange({ file, type: "replace" });
  }

  function removeImage() {
    setError(null);
    setFileName(null);
    setSelectedPreviewUrl(null);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(initialImageUrl ? { type: "remove" } : { type: "keep" });
  }

  return (
    <section aria-labelledby={`${inputId}-heading`} className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800" id={`${inputId}-heading`}>
          Cover image
        </h2>
        <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP. Maximum 2 MB.</p>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-leaf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Recipe cover preview" className="aspect-[4/3] w-full object-cover" src={previewUrl} />
        </div>
      ) : null}

      {fileName ? <p className="truncate text-xs text-slate-500">Selected: {fileName}</p> : null}
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}

      <div className="flex gap-2">
        <label
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-leaf-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          htmlFor={inputId}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {previewUrl ? "Replace image" : "Choose image"}
        </label>
        <input
          accept={RECIPE_IMAGE_ACCEPT}
          className="sr-only"
          id={inputId}
          onChange={(event) => selectImage(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        {previewUrl ? (
          <ActionButton onClick={removeImage} type="button" variant="danger">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </ActionButton>
        ) : null}
      </div>
    </section>
  );
}
