import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  GroceryListItemDto,
  GroceryListItemSourceDto
} from "../grocery-list.types";
import { GroceryListItemRow } from "../GroceryListItemRow";

function source(id: string, recipeId: string, recipeTitle: string): GroceryListItemSourceDto {
  return {
    canonicalUnit: "tbsp",
    contributedAmount: 1,
    id,
    original: {
      amount: 1,
      name: "Pepper",
      notes: null,
      unit: "tbsp"
    },
    recipeId,
    recipeIngredientId: `ingredient-${id}`,
    recipeTitle,
    savedServings: 4,
    scaleFactor: 1,
    sortOrder: 0,
    targetServings: 4
  };
}

function item(sources: GroceryListItemSourceDto[]): GroceryListItemDto {
  return {
    amount: null,
    checked: false,
    id: "item-pepper",
    isManual: false,
    name: "Pepper",
    notes: null,
    quantityOverridden: false,
    requirementGroups: [
      {
        amount: sources.length,
        contributionCount: sources.length,
        displayUnit: "tbsp",
        key: "tbsp",
        kind: "measured",
        sourceCount: sources.length
      }
    ],
    sources,
    unit: null
  };
}

describe("GroceryListItemRow", () => {
  it("names the single source recipe", () => {
    render(
      <ul>
        <GroceryListItemRow
          isChecking={false}
          item={item([source("1", "recipe-1", "Pepper noodles")])}
          onCheck={vi.fn()}
          onEdit={vi.fn()}
        />
      </ul>
    );

    expect(screen.getByText("From Pepper noodles")).toBeInTheDocument();
  });

  it("uses a count for multiple distinct recipe sources", () => {
    render(
      <ul>
        <GroceryListItemRow
          isChecking={false}
          item={item([
            source("1", "recipe-1", "Pepper noodles"),
            source("2", "recipe-2", "Fried rice")
          ])}
          onCheck={vi.fn()}
          onEdit={vi.fn()}
        />
      </ul>
    );

    expect(screen.getByText("Used in 2 recipes")).toBeInTheDocument();
  });

  it("explains how many recipes gave no quantity for an extra group", () => {
    const groceryItem = item([
      source("1", "recipe-1", "Pepper noodles"),
      source("2", "recipe-2", "Fried rice")
    ]);
    groceryItem.requirementGroups = [
      {
        amount: null,
        contributionCount: 2,
        displayUnit: null,
        key: "extra",
        kind: "extra",
        sourceCount: 2
      }
    ];

    render(
      <ul>
        <GroceryListItemRow
          isChecking={false}
          item={groceryItem}
          onCheck={vi.fn()}
          onEdit={vi.fn()}
        />
      </ul>
    );

    expect(screen.getByText("2 recipes gave no quantity")).toBeInTheDocument();
  });
});
