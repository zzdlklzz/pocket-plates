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

vi.mock("@/features/profile/ProfileEditor", () => ({
  ProfileEditor: () => <div>Profile editor</div>
}));

import Loading from "../loading";
import ProfilePage from "../page";

describe("ProfilePage", () => {
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

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("renders the editor without passing the Auth user to the client", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });

    render(await ProfilePage());

    expect(screen.getByText("Profile editor")).toBeInTheDocument();
  });

  it("provides an immediate route loading state", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
  });
});
