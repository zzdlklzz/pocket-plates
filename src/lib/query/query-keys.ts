export const queryKeys = {
  mealPlanning: {
    all: ["meal-planning"] as const,
    week: (weekStartDate: string) => ["meal-planning", "week", weekStartDate] as const
  },
  recipes: {
    all: ["recipes"] as const,
    archivedList: ["recipes", "archived"] as const,
    list: (filters: Record<string, unknown>) => ["recipes", "list", filters] as const,
    mealPlanOptions: ["recipes", "meal-plan-options"] as const,
    detail: (id: string) => ["recipes", "detail", id] as const
  }
};
