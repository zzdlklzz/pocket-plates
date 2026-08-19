import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionButton } from "../ActionButton";
import { AppPageShell } from "../AppPageShell";
import { BackLink } from "../BackLink";
import { InlineNotice } from "../InlineNotice";
import { SelectableChip } from "../SelectableChip";

describe("shared UI components", () => {
  it("renders pending action buttons as busy and disabled", () => {
    render(
      <ActionButton fullWidth pending pendingLabel="Saving..." type="submit">
        Save
      </ActionButton>
    );

    const button = screen.getByRole("button", { name: "Saving..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveClass("w-full", "bg-leaf-700");
  });

  it("exposes selectable chip state and click behavior", () => {
    const onClick = vi.fn();
    render(
      <SelectableChip onClick={onClick} selected surface="plain">
        Dinner
      </SelectableChip>
    );

    const chip = screen.getByRole("button", { name: "Dinner" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("bg-leaf-700");
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps shared page, notice, and back-link semantics", () => {
    render(
      <AppPageShell spacing="compact">
        <BackLink href="/">Library</BackLink>
        <InlineNotice tone="error">Could not load.</InlineNotice>
      </AppPageShell>
    );

    expect(screen.getByRole("main")).toHaveClass("max-w-md", "py-8");
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Could not load.")).toHaveClass("border-red-100", "text-red-700");
  });
});
