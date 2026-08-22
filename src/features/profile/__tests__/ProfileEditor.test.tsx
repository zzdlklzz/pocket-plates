import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileError } from "../profile.errors";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  useOwnProfile: vi.fn(),
  useUpdateOwnProfile: vi.fn()
}));

vi.mock("../profile.queries", () => ({
  useOwnProfile: mocks.useOwnProfile,
  useUpdateOwnProfile: mocks.useUpdateOwnProfile
}));

import { ProfileEditor } from "../ProfileEditor";

describe("ProfileEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useOwnProfile.mockReturnValue({
      data: { displayName: "Dani Lim", username: "dlkl" },
      error: null,
      isPending: false,
      refetch: mocks.refetch
    });
    mocks.useUpdateOwnProfile.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: mocks.mutateAsync
    });
  });

  it("loads existing profile values and the public handle hint", () => {
    render(<ProfileEditor />);

    expect(screen.getByLabelText("Display name")).toHaveValue("Dani Lim");
    expect(screen.getByLabelText("Username")).toHaveValue("dlkl");
    expect(screen.getByText("Shown publicly as @dlkl")).toBeInTheDocument();
  });

  it("renders incomplete profiles as empty fields", () => {
    mocks.useOwnProfile.mockReturnValue({
      data: { displayName: null, username: null },
      error: null,
      isPending: false,
      refetch: mocks.refetch
    });

    render(<ProfileEditor />);

    expect(screen.getByLabelText("Display name")).toHaveValue("");
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });

  it("validates fields before saving", async () => {
    render(<ProfileEditor />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "no-dashes" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByText("Use only lowercase letters, numbers, and underscores.")
    ).toBeInTheDocument();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("shows normalized saved values and confirmation", async () => {
    mocks.mutateAsync.mockResolvedValue({
      displayName: "Dani Lim",
      username: "dlkl"
    });
    render(<ProfileEditor />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "  Dani   Lim " }
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: " DlkL " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Profile saved");
    expect(screen.getByLabelText("Display name")).toHaveValue("Dani Lim");
    expect(screen.getByLabelText("Username")).toHaveValue("dlkl");
  });

  it("associates duplicate username errors with the username field", async () => {
    mocks.mutateAsync.mockRejectedValue(new ProfileError("username-taken"));
    render(<ProfileEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("That username is already taken.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveFocus());
  });

  it("disables the form while saving", () => {
    mocks.useUpdateOwnProfile.mockReturnValue({
      error: null,
      isPending: true,
      mutateAsync: mocks.mutateAsync
    });

    render(<ProfileEditor />);

    expect(screen.getByLabelText("Display name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
