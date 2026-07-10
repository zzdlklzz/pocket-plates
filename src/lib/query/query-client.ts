"use client";

import { QueryClient } from "@tanstack/react-query";
import { QUERY_DEFAULTS } from "./query.constants";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_DEFAULTS.staleTimeMs,
        retry: QUERY_DEFAULTS.retryCount,
        refetchOnWindowFocus: QUERY_DEFAULTS.refetchOnWindowFocus
      }
    }
  });
}

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
