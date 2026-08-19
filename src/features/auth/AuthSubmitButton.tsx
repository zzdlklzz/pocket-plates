"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ActionButton, type ActionButtonVariant } from "@/components/ui/ActionButton";

type AuthSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: Extract<ActionButtonVariant, "primary" | "secondary">;
};

export function AuthSubmitButton({ children, pendingLabel, variant = "primary" }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <ActionButton
      fullWidth
      pending={pending}
      pendingLabel={pendingLabel}
      type="submit"
      variant={variant}
    >
      {children}
    </ActionButton>
  );
}
