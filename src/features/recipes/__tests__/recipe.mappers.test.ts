import { describe, expect, it } from "vitest";
import { toRecipeCardDto } from "../recipe.mappers";

describe("toRecipeCardDto", () => {
  it("maps database row names to app DTO names", () => {
    expect(
      toRecipeCardDto({
        id: "recipe-1",
        title: "Rice Bowl",
        cost_rating: "cheap",
        difficulty: "easy",
        image_url: null
      })
    ).toEqual({
      id: "recipe-1",
      title: "Rice Bowl",
      costRating: "cheap",
      difficulty: "easy",
      imageUrl: null
    });
  });
});
