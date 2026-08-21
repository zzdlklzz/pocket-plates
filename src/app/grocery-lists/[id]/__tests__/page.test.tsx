import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  groceryListDetail: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));
vi.mock("@/features/grocery-lists/GroceryListDetail", () => ({
  GroceryListDetail: ({ id }: { id: string }) => {
    mocks.groceryListDetail(id);
    return <div>Grocery list detail</div>;
  }
}));

import Loading from "../loading";
import GroceryListDetailPage from "../page";

describe("GroceryListDetailPage", () => {
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

    await expect(
      GroceryListDetailPage({ params: Promise.resolve({ id: "list-1" }) })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("passes the route id to the detail component", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await GroceryListDetailPage({
      params: Promise.resolve({ id: "list-1" })
    }));

    expect(screen.getByText("Grocery list detail")).toBeInTheDocument();
    expect(mocks.groceryListDetail).toHaveBeenCalledWith("list-1");
  });

  it("provides an immediate loading state", () => {
    render(<Loading />);
    expect(screen.getByRole("status", { name: "Loading grocery list" })).toBeInTheDocument();
  });
});
