import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/query-keys";

const mocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  getOwnProfile: vi.fn(),
  refresh: vi.fn(),
  updateOwnProfile: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createSupabaseBrowserClient
}));

vi.mock("../profile.repository", () => ({
  getOwnProfile: mocks.getOwnProfile,
  updateOwnProfile: mocks.updateOwnProfile
}));

import { useOwnProfile, useUpdateOwnProfile } from "../profile.queries";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false }
    }
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("profile queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseBrowserClient.mockReturnValue({ client: "supabase" });
  });

  it("loads the current profile under its own query key", async () => {
    const profile = { displayName: "Dani Lim", username: "dlkl" };
    mocks.getOwnProfile.mockResolvedValue(profile);
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useOwnProfile(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(queryKeys.profile.current)).toBe(profile);
    expect(mocks.getOwnProfile).toHaveBeenCalledWith({ client: "supabase" });
  });

  it("updates only the profile cache and refreshes server identity", async () => {
    const profile = { displayName: "Dani Lim", username: "dlkl" };
    mocks.updateOwnProfile.mockResolvedValue(profile);
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateOwnProfile(), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync({
        displayName: "Dani Lim",
        username: "dlkl"
      });
    });

    expect(queryClient.getQueryData(queryKeys.profile.current)).toEqual(profile);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.profile.current
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
