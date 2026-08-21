export const queryKeys = {
  groceryLists: {
    all: ["grocery-lists"] as const,
    list: ["grocery-lists", "list"] as const,
    detail: (id: string) => ["grocery-lists", "detail", id] as const,
    recipeOptions: ["grocery-lists", "recipe-options"] as const,
    recipeOptionSearch: (search: string) =>
      ["grocery-lists", "recipe-options", search] as const,
    recipePreviews: ["grocery-lists", "recipe-preview"] as const,
    recipePreview: (recipes: readonly unknown[]) =>
      ["grocery-lists", "recipe-preview", recipes] as const,
    mealPlanSource: (weekStartDate: string) =>
      ["grocery-lists", "meal-plan-source", weekStartDate] as const
  },
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
