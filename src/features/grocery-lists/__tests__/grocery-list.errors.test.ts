import { describe, expect, it } from "vitest";
import {
  DuplicateGroceryListItemError,
  GroceryListItemLimitError,
  GroceryListNotFoundError,
  GroceryListRecipeUnavailableError,
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
    expect(
      getGroceryListErrorMessage(
        new GroceryListRecipeUnavailableError(),
        "create"
      )
    ).toBe(
      "One selected recipe is no longer available. Review your selections and try again."
    );
    expect(
      getGroceryListErrorMessage(new GroceryListItemLimitError(), "create")
    ).toBe(
      "This selection creates more than 300 grocery items. Remove a recipe or choose recipes with fewer ingredients."
    );
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
