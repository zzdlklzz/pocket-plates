"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogFocusManagementOptions = {
  containerRef: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  isBusy?: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function useDialogFocusManagement({
  containerRef,
  fallbackFocusRef,
  initialFocusRef,
  isBusy = false,
  onClose,
  returnFocusRef
}: DialogFocusManagementOptions) {
  const isBusyRef = useRef(isBusy);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef(
    (originalReturnFocus: HTMLElement | null | undefined, originalFallbackFocus: HTMLElement | null | undefined) => {
      if (originalReturnFocus?.isConnected) {
        originalReturnFocus.focus();
      } else {
        originalFallbackFocus?.focus();
      }
    }
  );

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    restoreFocusRef.current = (originalReturnFocus, originalFallbackFocus) => {
      const currentReturnFocus = returnFocusRef?.current;
      const currentFallbackFocus = fallbackFocusRef?.current;

      if (currentReturnFocus?.isConnected) {
        currentReturnFocus.focus();
      } else if (originalReturnFocus?.isConnected) {
        originalReturnFocus.focus();
      } else if (currentFallbackFocus?.isConnected) {
        currentFallbackFocus.focus();
      } else {
        originalFallbackFocus?.focus();
      }
    };
  }, [fallbackFocusRef, returnFocusRef]);

  useEffect(() => {
    const returnFocus = returnFocusRef?.current;
    const fallbackFocus = fallbackFocusRef?.current;
    initialFocusRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) {
        return;
      }

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current(returnFocus, fallbackFocus);
    };
  }, [containerRef, fallbackFocusRef, initialFocusRef, returnFocusRef]);
}
