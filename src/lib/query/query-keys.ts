export const queryKeys = {
  recipes: {
    all: ["recipes"] as const,
    list: (filters: Record<string, unknown>) => ["recipes", "list", filters] as const,
    detail: (id: string) => ["recipes", "detail", id] as const
  }
};
