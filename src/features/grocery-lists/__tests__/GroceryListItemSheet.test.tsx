import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { GroceryListItemSheet } from "../GroceryListItemSheet";
import type { GroceryListItemDto } from "../grocery-list.types";

function generatedItem(quantityOverridden = false): GroceryListItemDto {
  return {
    amount: quantityOverridden ? 1 : null,
    checked: false,
    id: "item-pepper",
    isManual: false,
    name: "Pepper",
    notes: "For the pantry",
    quantityOverridden,
    requirementGroups: [
      {
        amount: 2,
        contributionCount: 1,
        displayUnit: "tbsp",
        key: "tbsp",
        kind: "measured",
        sourceCount: 1
      }
    ],
    sources: [
      {
        canonicalUnit: "tbsp",
        contributedAmount: 2,
        id: "source-1",
        original: {
          amount: 2,
          name: "Pepper",
          notes: "ground",
          unit: "tbsp"
        },
        recipeId: "recipe-1",
        recipeIngredientId: "ingredient-1",
        recipeTitle: "Pepper noodles",
        savedServings: 4,
        scaleFactor: 1,
        sortOrder: 0,
        targetServings: 4
      }
    ],
    unit: quantityOverridden ? "jar" : null
  };
}

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

  it("sets a practical amount without changing recipe source history", async () => {
    const item = generatedItem();
    const originalSources = structuredClone(item.sources);
    const { props } = renderSheet({ item });

    expect(screen.queryByRole("textbox", { name: "Amount" })).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Set a practical shopping amount" })
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Unit" }), {
      target: { value: "jar" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith(
        {
          amount: "1",
          name: "Pepper",
          notes: "For the pantry",
          unit: "jar"
        },
        true
      );
    });
    expect(item.sources).toEqual(originalSources);
  });

  it("resets an override without changing recipe source history", async () => {
    const item = generatedItem(true);
    const originalSources = structuredClone(item.sources);
    const { props } = renderSheet({ item });

    fireEvent.click(
      screen.getByRole("button", { name: "Use recipe requirements" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith(
        {
          amount: "",
          name: "Pepper",
          notes: "For the pantry",
          unit: ""
        },
        false
      );
    });
    expect(item.sources).toEqual(originalSources);
  });

  it("requires a numeric amount for a practical override", () => {
    const { props } = renderSheet({ item: generatedItem() });

    fireEvent.click(
      screen.getByRole("button", { name: "Set a practical shopping amount" })
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Unit" }), {
      target: { value: "jar" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add an amount, or use recipe requirements."
    );
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
