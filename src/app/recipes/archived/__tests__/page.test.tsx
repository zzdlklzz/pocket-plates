import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock("@/features/recipes/archived-recipe-library", () => ({
  ArchivedRecipeLibrary: () => <div>Archived recipe library</div>
}));

import Loading from "../loading";
import ArchivedRecipesPage from "../page";

describe("ArchivedRecipesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser }
    });
  });

  it("redirects signed-out visitors to the home page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(ArchivedRecipesPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("renders the archived library for a signed-in user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    render(await ArchivedRecipesPage());

    expect(screen.getByText("Archived recipe library")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("provides an immediate route loading state", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: "Loading archived recipes" })).toBeInTheDocument();
  });
});
