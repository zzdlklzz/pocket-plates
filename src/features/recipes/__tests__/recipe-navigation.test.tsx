import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeNavigation } from "../RecipeNavigation";

describe("RecipeNavigation", () => {
  it("keeps Add centered between Home and More", () => {
    render(<RecipeNavigation activePage="home" />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Add recipe" })).toHaveAttribute("href", "/recipes/new");
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toHaveClass("grid-cols-3");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Archived recipes" })).not.toBeInTheDocument();
  });

  it("opens secondary destinations in the More sheet", () => {
    render(<RecipeNavigation activePage="archived" />);

    const moreButton = screen.getByRole("button", { name: "More" });
    expect(moreButton).toHaveAttribute("aria-current", "page");
    fireEvent.click(moreButton);

    const dialog = screen.getByRole("dialog", { name: "More" });
    const archivedLink = within(dialog).getByRole("link", { name: "Archived recipes" });
    expect(archivedLink).toHaveAttribute("href", "/recipes/archived");
    expect(archivedLink).toHaveAttribute("aria-current", "page");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "More" })).not.toBeInTheDocument();
  });
});
