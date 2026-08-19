"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type SelectableChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  selected: boolean;
  surface?: "plain" | "tinted";
};

export function SelectableChip({ children, className, selected, surface = "tinted", ...props }: SelectableChipProps) {
  const stateClass = selected
    ? "bg-leaf-700 font-semibold text-white"
    : surface === "plain"
      ? "border border-slate-200 bg-white font-medium text-slate-600"
      : "border border-leaf-100 bg-leaf-50 font-medium text-slate-600";

  return (
    <button
      aria-pressed={selected}
      className={["rounded-full px-3 py-2 text-xs", stateClass, className].filter(Boolean).join(" ")}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
