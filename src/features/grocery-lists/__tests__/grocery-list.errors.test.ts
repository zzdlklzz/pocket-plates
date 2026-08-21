import { describe, expect, it } from "vitest";
import {
  DuplicateGroceryListItemError,
  GroceryListNotFoundError,
  getGroceryListErrorMessage
} from "../grocery-list.errors";

describe("grocery list errors", () => {
  it("preserves focused duplicate and not-found messages", () => {
    expect(
      getGroceryListErrorMessage(new DuplicateGroceryListItemError(), "saveItem")
    ).toBe("That item is already on this list.");
    expect(
      getGroceryListErrorMessage(new GroceryListNotFoundError(), "loadDetail")
    ).toBe("This grocery list is unavailable.");
  });

  it("does not expose permission, constraint, or network details", () => {
    expect(
      getGroceryListErrorMessage(
        { code: "42501", message: "row-level security violation" },
        "update"
      )
    ).toBe("You do not have access to change this grocery list.");
    expect(
      getGroceryListErrorMessage(
        { code: "23514", message: "internal constraint name" },
        "saveItem"
      )
    ).toBe("Check the item details and try again.");
    expect(
      getGroceryListErrorMessage(new TypeError("Failed to fetch"), "loadList")
    ).toBe("Check your connection and try again.");
  });
});
