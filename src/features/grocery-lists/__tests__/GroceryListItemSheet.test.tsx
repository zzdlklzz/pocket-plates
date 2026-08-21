import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { GroceryListItemSheet } from "../GroceryListItemSheet";

function renderSheet(overrides: Partial<Parameters<typeof GroceryListItemSheet>[0]> = {}) {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  const returnFocusRef = createRef<HTMLButtonElement>();
  returnFocusRef.current = trigger;
  const props = {
    error: null,
    isPending: false,
    isRemovePending: false,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    removeError: null,
    returnFocusRef,
    ...overrides
  };

  return { props, ...render(<GroceryListItemSheet {...props} />) };
}

describe("GroceryListItemSheet", () => {
  it("validates item name before saving", () => {
    const { props } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add an item name.");

    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it.each(["a lot", "0.0000001", "1e308"])(
    "rejects an unsupported amount before saving: %s",
    (amount) => {
      const { props } = renderSheet();

      fireEvent.change(screen.getByRole("textbox", { name: "Item" }), {
        target: { value: "Milk" }
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
        target: { value: amount }
      });
      fireEvent.click(screen.getByRole("button", { name: "Add item" }));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Use a positive number or simple fraction"
      );
      expect(props.onSubmit).not.toHaveBeenCalled();
    }
  );

  it("closes with Escape and restores focus", async () => {
    const { props, unmount } = renderSheet();

    expect(screen.getByRole("button", { name: "Close add item" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledOnce();
    unmount();

    await waitFor(() => expect(props.returnFocusRef.current).toHaveFocus());
    props.returnFocusRef.current?.remove();
  });

  it("wraps keyboard focus within the sheet", () => {
    const { props, unmount } = renderSheet();
    const closeButton = screen.getByRole("button", { name: "Close add item" });
    const submitButton = screen.getByRole("button", { name: "Add item" });

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(submitButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    unmount();
    props.returnFocusRef.current?.remove();
  });
});
