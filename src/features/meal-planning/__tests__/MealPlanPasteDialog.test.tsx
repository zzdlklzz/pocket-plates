import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealPlanPasteDialog } from "../MealPlanPasteDialog";

function dialogProps() {
  return {
    addCount: 6,
    archivedCount: 1,
    copyKind: "week" as const,
    deletedCount: 1,
    duplicateCount: 2,
    error: null,
    hasPreview: true,
    isPending: false,
    isPreviewPending: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onRetryPreview: vi.fn(),
    previewError: null,
    returnFocusRef: { current: null }
  };
}

describe("MealPlanPasteDialog", () => {
  it("summarizes additive and skipped meals before confirmation", () => {
    const props = dialogProps();
    render(<MealPlanPasteDialog {...props} />);
    const dialog = screen.getByRole("dialog", { name: "Paste copied week?" });

    expect(dialog).toHaveClass("max-h-[calc(100dvh-1rem)]", "overflow-hidden");
    expect(within(dialog).getByText("6 meals will be added")).toBeInTheDocument();
    expect(within(dialog).getByText("Duplicates").nextSibling).toHaveTextContent("2");
    expect(within(dialog).getByText("Archived recipes").nextSibling).toHaveTextContent("1");
    expect(within(dialog).getByText("Deleted or unavailable").nextSibling).toHaveTextContent("1");
    expect(within(dialog).getByRole("button", { name: "Paste 6 meals" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Close paste preview" })).toHaveFocus();
  });

  it("keeps a failed paste retryable", () => {
    const props = dialogProps();
    render(<MealPlanPasteDialog {...props} error={new Error("paste failed")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No existing meals were removed");
    fireEvent.click(screen.getByRole("button", { name: "Paste 6 meals" }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("prevents close and confirmation while pending or empty", () => {
    const props = dialogProps();
    const { rerender } = render(<MealPlanPasteDialog {...props} isPending />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pasting meals..." })).toBeDisabled();

    rerender(<MealPlanPasteDialog {...props} addCount={0} />);
    expect(screen.getByRole("button", { name: "Nothing to paste" })).toBeDisabled();
  });

  it("announces preview loading and allows retry after an error", () => {
    const props = dialogProps();
    const { rerender } = render(
      <MealPlanPasteDialog {...props} hasPreview={false} isPreviewPending />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Checking copied meals...");
    expect(screen.getByRole("button", { name: "Checking copied meals..." })).toBeDisabled();

    rerender(
      <MealPlanPasteDialog
        {...props}
        hasPreview={false}
        previewError={new Error("preview failed")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetryPreview).toHaveBeenCalledTimes(1);
  });
});
