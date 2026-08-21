import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));
vi.mock("@/features/grocery-lists/GroceryListLibrary", () => ({
  GroceryListLibrary: () => <div>Grocery list library</div>
}));

import Loading from "../loading";
import GroceryListsPage from "../page";

describe("GroceryListsPage", () => {
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

    await expect(GroceryListsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("renders the library for a signed-in user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await GroceryListsPage());

    expect(screen.getByText("Grocery list library")).toBeInTheDocument();
  });

  it("provides an immediate loading state", () => {
    render(<Loading />);
    expect(screen.getByRole("status", { name: "Loading grocery lists" })).toBeInTheDocument();
  });
});
