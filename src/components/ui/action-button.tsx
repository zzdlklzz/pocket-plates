"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionButtonVariant = "primary" | "secondary" | "danger";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  pending?: boolean;
  pendingLabel?: ReactNode;
  variant?: ActionButtonVariant;
};

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  primary: "bg-leaf-700 text-white disabled:bg-slate-300",
  secondary: "border border-slate-200 bg-white text-slate-700 disabled:text-slate-400",
  danger: "border border-red-100 bg-white text-red-700 disabled:text-slate-400"
};

export function ActionButton({
  children,
  className,
  disabled,
  fullWidth = false,
  pending = false,
  pendingLabel,
  type = "button",
  variant = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      aria-busy={pending || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold",
        fullWidth ? "w-full" : "",
        VARIANT_CLASSES[variant],
        className
      ].filter(Boolean).join(" ")}
      disabled={disabled || pending}
      type={type}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
