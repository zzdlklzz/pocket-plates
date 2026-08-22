import { describe, expect, it, vi } from "vitest";
import { ProfileError } from "../profile.errors";
import { OWN_PROFILE_SELECT } from "../profile.mappers";
import { getOwnProfile, updateOwnProfile } from "../profile.repository";

function createReadClient({
  authError = null,
  data = { display_name: "Dani Lim", username: "dlkl" },
  error = null,
  user = { id: "owner-1" }
}: {
  authError?: unknown;
  data?: { display_name: string | null; username: string | null } | null;
  error?: unknown;
  user?: { id: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const getUser = vi.fn().mockResolvedValue({
    data: { user },
    error: authError
  });

  return {
    client: { auth: { getUser }, from: vi.fn(() => ({ select })) },
    eq,
    getUser,
    select
  };
}

function createUpdateClient({
  data = { display_name: "Dani Lim", username: "dlkl" },
  error = null
}: {
  data?: { display_name: string | null; username: string | null } | null;
  error?: unknown;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "owner-1" } },
    error: null
  });

  return {
    client: { auth: { getUser }, from: vi.fn(() => ({ update })) },
    eq,
    select,
    update
  };
}

describe("profile repository", () => {
  it("selects only the current user's identity fields", async () => {
    const { client, eq, select } = createReadClient();

    await expect(getOwnProfile(client as never)).resolves.toEqual({
      displayName: "Dani Lim",
      username: "dlkl"
    });
    expect(select).toHaveBeenCalledWith(OWN_PROFILE_SELECT);
    expect(eq).toHaveBeenCalledWith("id", "owner-1");
  });

  it("requires authentication and an existing profile row", async () => {
    await expect(
      getOwnProfile(createReadClient({ user: null }).client as never)
    ).rejects.toMatchObject({ kind: "auth" });
    await expect(
      getOwnProfile(createReadClient({ data: null }).client as never)
    ).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("normalizes and updates exactly the two editable columns", async () => {
    const { client, eq, select, update } = createUpdateClient();

    await expect(
      updateOwnProfile(client as never, {
        displayName: "  Dani   Lim ",
        username: " DlkL "
      })
    ).resolves.toEqual({ displayName: "Dani Lim", username: "dlkl" });
    expect(update).toHaveBeenCalledWith({
      display_name: "Dani Lim",
      username: "dlkl"
    });
    expect(eq).toHaveBeenCalledWith("id", "owner-1");
    expect(select).toHaveBeenCalledWith(OWN_PROFILE_SELECT);
  });

  it("rejects invalid input before issuing an update", async () => {
    const { client, update } = createUpdateClient();

    await expect(
      updateOwnProfile(client as never, {
        displayName: "Dani",
        username: "no-dashes"
      })
    ).rejects.toBeInstanceOf(ProfileError);
    expect(update).not.toHaveBeenCalled();
  });

  it("maps uniqueness errors without exposing database details", async () => {
    const { client } = createUpdateClient({
      data: null,
      error: { code: "23505", message: "profiles_username_lower_unique_idx" }
    });

    await expect(
      updateOwnProfile(client as never, {
        displayName: "Dani",
        username: "dlkl"
      })
    ).rejects.toMatchObject({
      kind: "username-taken",
      message: "That username is already taken."
    });
  });
});
