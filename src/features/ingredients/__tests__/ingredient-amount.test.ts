import { describe, expect, it } from "vitest";
import { parseIngredientAmount } from "../ingredient-amount";

describe("parseIngredientAmount", () => {
  it.each([
    ["", null],
    ["   ", null],
    ["1", 1],
    [" 1.5 ", 1.5],
    ["1/2", 0.5],
    ["2/4", 0.5],
    ["1 1/2", 1.5]
  ])("parses %j as %s", (value, expected) => {
    expect(parseIngredientAmount(value)).toBe(expected);
  });

  it.each([
    "0",
    "-1",
    "NaN",
    "Infinity",
    "abc",
    "1/0",
    "0/2",
    "1 0/2",
    "1 2/2",
    "1 3/2"
  ])("rejects %j", (value) => {
    expect(parseIngredientAmount(value)).toBeNull();
  });
});
