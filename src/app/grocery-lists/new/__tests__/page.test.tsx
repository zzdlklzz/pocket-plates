import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  newGroceryList: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));
vi.mock("@/features/grocery-lists/GroceryListLibrary", () => ({
  NewGroceryList: (props: { source: string; weekStartDate?: string }) => {
    mocks.newGroceryList(props);
    const { source } = props;
    return <div>New grocery list: {source}</div>;
  }
}));

import Loading from "../loading";
import NewGroceryListPage from "../page";

describe("NewGroceryListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser }
    });
  });

  it("redirects signed-out visitors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(NewGroceryListPage()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("selects only the supported recipes source", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await NewGroceryListPage({
      searchParams: Promise.resolve({ source: "recipes" })
    }));

    expect(screen.getByText("New grocery list: recipes")).toBeInTheDocument();
    expect(mocks.newGroceryList).toHaveBeenCalledWith({ source: "recipes" });
  });

  it("selects and normalizes a valid meal-plan week", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await NewGroceryListPage({
      searchParams: Promise.resolve({
        source: "meal-plan",
        week: "2026-08-20"
      })
    }));

    expect(screen.getByText("New grocery list: meal-plan")).toBeInTheDocument();
    expect(mocks.newGroceryList).toHaveBeenCalledWith({
      source: "meal-plan",
      weekStartDate: "2026-08-17"
    });
  });

  it.each([
    { source: "meal-plan", week: undefined },
    { source: "meal-plan", week: "not-a-date" },
    { source: "meal-plan", week: ["2026-08-17", "2026-08-24"] },
    { source: ["meal-plan", "meal-plan"], week: "2026-08-17" }
  ])("falls back safely for invalid meal-plan parameters", async (params) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await NewGroceryListPage({
      searchParams: Promise.resolve(params)
    }));

    expect(screen.getByText("New grocery list: blank")).toBeInTheDocument();
    expect(mocks.newGroceryList).toHaveBeenCalledWith({ source: "blank" });
  });

  it.each([
    undefined,
    "unknown",
    ["recipes", "recipes"]
  ])("falls back to blank for a %s source", async (source) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await NewGroceryListPage({
      searchParams: Promise.resolve({ source })
    }));

    expect(screen.getByText("New grocery list: blank")).toBeInTheDocument();
  });

  it("provides an immediate loading state", () => {
    render(<Loading />);
    expect(screen.getByRole("status", { name: "Loading new grocery list" })).toBeInTheDocument();
  });
});
