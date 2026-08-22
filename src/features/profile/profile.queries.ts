"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query/query-keys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getOwnProfile, updateOwnProfile } from "./profile.repository";
import type { UpdateOwnProfileInput } from "./profile.types";

export function useOwnProfile() {
  return useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: () => getOwnProfile(createSupabaseBrowserClient())
  });
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: UpdateOwnProfileInput) =>
      updateOwnProfile(createSupabaseBrowserClient(), input),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.profile.current, profile);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current
      });
      router.refresh();
    }
  });
}
