"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type AuthSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "quiet";
};

export function AuthSubmitButton({ children, pendingLabel, variant = "primary" }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
      : variant === "secondary"
        ? "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
        : "inline-flex items-center justify-center text-sm font-semibold text-leaf-700 disabled:text-slate-400";

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
