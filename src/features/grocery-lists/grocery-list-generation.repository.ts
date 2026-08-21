import type { IsoDate } from "@/features/meal-planning/meal-planning.types";
import {
  GroceryListAuthenticationError,
  GroceryListItemLimitError,
  GroceryListMealPlanUnavailableError,
  GroceryListRecipeUnavailableError
} from "./grocery-list.errors";
import { generateGroceryListItems } from "./grocery-list.generation";
import {
  toGeneratedGroceryListRpcItems,
  toGroceryListGenerationRecipeInput,
  toGroceryListRecipeOptionDto,
  toMealPlanGrocerySourceDto,
  type GroceryListGenerationRecipeRow,
  type GroceryListRecipeOptionRow,
  type MealPlanGrocerySourceRow
} from "./grocery-list.mappers";
import {
  getAuthenticatedGroceryListOwnerId,
  getGroceryListDatabaseError,
  type SupabaseBrowserClient
} from "./grocery-list.repository-client";
import type {
  CreateGeneratedGroceryListInput,
  CreateMealPlanGroceryListInput,
  RefreshGroceryListFromWeekInput,
  SelectedGroceryListRecipeInput
} from "./grocery-list.types";
import {
  isUuid,
  parseCreateGeneratedGroceryListInput,
  parseCreateMealPlanGroceryListInput,
  parseMealPlanGroceryWeekStart,
  parseSelectedGroceryListRecipes
} from "./grocery-list.validation";

const GROCERY_LIST_GENERATION_RECIPE_SELECT =
  "id,title,servings,recipe_ingredients(id,name,amount,unit,notes,sort_order)";
const MEAL_PLAN_GROCERY_SOURCE_SELECT =
  "id,week_start_date,meal_plan_entries(id,recipe_id,planned_for,meal_type,servings,recipes(id,title,servings,archived_at,recipe_ingredients(id,name,amount,unit,notes,sort_order)))";
const LINKED_MEAL_PLAN_GROCERY_SOURCE_SELECT =
  `id,source_type,meal_plan_id,meal_plans(${MEAL_PLAN_GROCERY_SOURCE_SELECT})`;
const LINKED_MEAL_PLAN_GROCERY_LIST_INDEX =
  "grocery_lists_one_linked_meal_plan_week_idx";

type LinkedMealPlanGrocerySourceRow = {
  id: string;
  meal_plan_id: string | null;
  meal_plans: MealPlanGrocerySourceRow | null;
  source_type: "manual" | "recipes" | "meal_plan";
};

function isStaleGeneratedSourceError(error: unknown) {
  const { message } = getGroceryListDatabaseError(error);

  return [
    "source recipe is not available",
    "source ingredient is not available",
    "must include every recipe ingredient"
  ].some((candidate) => message.includes(candidate));
}

function isUnavailableMealPlanError(error: unknown) {
  const { message } = getGroceryListDatabaseError(error);

  return [
    "meal plan is not available",
    "meal-plan grocery list is not available",
    "source recipe is not available",
    "source ingredient is not available",
    "must include every planned recipe",
    "must include every recipe ingredient",
    "do not match the meal plan"
  ].some((candidate) => message.includes(candidate));
}

function isLinkedMealPlanGroceryListConflict(error: unknown) {
  const databaseError = getGroceryListDatabaseError(error);
  return (
    databaseError.code === "23505" &&
    databaseError.message.includes(LINKED_MEAL_PLAN_GROCERY_LIST_INDEX)
  );
}

function generateSelectedRecipeItems(
  sources: Parameters<typeof generateGroceryListItems>[0]
) {
  try {
    return generateGroceryListItems(sources);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "A grocery list can contain at most 300 items."
    ) {
      throw new GroceryListItemLimitError();
    }

    throw error;
  }
}

function toAvailableMealPlanGrocerySource(
  row: MealPlanGrocerySourceRow,
  allowEmpty: boolean
) {
  try {
    const source = toMealPlanGrocerySourceDto(row, allowEmpty);
    if (!source) {
      throw new GroceryListMealPlanUnavailableError();
    }
    return source;
  } catch (error) {
    if (error instanceof GroceryListMealPlanUnavailableError) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message === "A grocery list can contain at most 300 items."
    ) {
      throw new GroceryListItemLimitError(
        "This week creates more than 300 grocery items. Reduce the planned meals and try again."
      );
    }
    throw new GroceryListMealPlanUnavailableError();
  }
}

function throwMealPlanRpcError(error: unknown): never {
  const databaseError = getGroceryListDatabaseError(error);
  if (
    databaseError.code === "42501" &&
    databaseError.message.includes("authentication is required")
  ) {
    throw new GroceryListAuthenticationError();
  }
  if (isUnavailableMealPlanError(error)) {
    throw new GroceryListMealPlanUnavailableError();
  }
  throw error;
}

export async function listGroceryListRecipeOptions(
  supabase: SupabaseBrowserClient,
  search: string
) {
  await getAuthenticatedGroceryListOwnerId(supabase);
  const { data, error } = await supabase.rpc(
    "search_grocery_list_recipe_options",
    { p_search: search.trim() || null } as never
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as GroceryListRecipeOptionRow[]).map(
    toGroceryListRecipeOptionDto
  );
}

export async function getSelectedRecipeGenerationSources(
  supabase: SupabaseBrowserClient,
  recipes: SelectedGroceryListRecipeInput[]
) {
  const selections = parseSelectedGroceryListRecipes(recipes);
  const ownerId = await getAuthenticatedGroceryListOwnerId(supabase);
  const { data, error } = await supabase
    .from("recipes")
    .select(GROCERY_LIST_GENERATION_RECIPE_SELECT)
    .eq("owner_id", ownerId)
    .in(
      "id",
      selections.map(({ recipeId }) => recipeId)
    )
    .is("archived_at", null);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as GroceryListGenerationRecipeRow[];
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  if (
    rowsById.size !== selections.length ||
    selections.some(
      ({ recipeId }) =>
        !(rowsById.get(recipeId)?.recipe_ingredients?.length ?? 0)
    )
  ) {
    throw new GroceryListRecipeUnavailableError();
  }

  return selections.map((selection) =>
    toGroceryListGenerationRecipeInput(
      rowsById.get(selection.recipeId)!,
      selection
    )
  );
}

export async function previewSelectedRecipeGroceryList(
  supabase: SupabaseBrowserClient,
  recipes: SelectedGroceryListRecipeInput[]
) {
  const sources = await getSelectedRecipeGenerationSources(supabase, recipes);
  return generateSelectedRecipeItems(sources);
}

export async function createGeneratedGroceryList(
  supabase: SupabaseBrowserClient,
  input: CreateGeneratedGroceryListInput
) {
  const parsed = parseCreateGeneratedGroceryListInput(input);
  const authoritativeSources = await getSelectedRecipeGenerationSources(
    supabase,
    parsed.recipes
  );
  const generatedItems = generateSelectedRecipeItems(authoritativeSources);
  const { data, error } = await supabase.rpc(
    "create_grocery_list_with_items",
    {
      p_items: toGeneratedGroceryListRpcItems(generatedItems),
      p_meal_plan_id: null,
      p_source_type: "recipes",
      p_source_week_start_date: null,
      p_title: parsed.title
    } as never
  );

  if (error) {
    const databaseError = getGroceryListDatabaseError(error);
    if (
      databaseError.code === "42501" &&
      databaseError.message.includes("authentication is required")
    ) {
      throw new GroceryListAuthenticationError();
    }
    if (isStaleGeneratedSourceError(error)) {
      throw new GroceryListRecipeUnavailableError();
    }
    throw error;
  }

  if (!data) {
    throw new Error("The grocery list was not created.");
  }

  return data as string;
}

export async function findLinkedMealPlanGroceryListId(
  supabase: SupabaseBrowserClient,
  ownerId: string,
  weekStartDate: IsoDate
) {
  const parsedWeekStart = parseMealPlanGroceryWeekStart(weekStartDate);
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("source_type", "meal_plan")
    .eq("source_week_start_date", parsedWeekStart)
    .not("meal_plan_id", "is", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { id: string } | null)?.id ?? null;
}

export async function getMealPlanGrocerySource(
  supabase: SupabaseBrowserClient,
  weekStartDate: IsoDate
) {
  const parsedWeekStart = parseMealPlanGroceryWeekStart(weekStartDate);
  const ownerId = await getAuthenticatedGroceryListOwnerId(supabase);
  const { data, error } = await supabase
    .from("meal_plans")
    .select(MEAL_PLAN_GROCERY_SOURCE_SELECT)
    .eq("owner_id", ownerId)
    .eq("week_start_date", parsedWeekStart)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new GroceryListMealPlanUnavailableError();
  }

  return toAvailableMealPlanGrocerySource(
    data as unknown as MealPlanGrocerySourceRow,
    false
  );
}

export async function createMealPlanGroceryList(
  supabase: SupabaseBrowserClient,
  input: CreateMealPlanGroceryListInput
) {
  const parsed = parseCreateMealPlanGroceryListInput(input);
  const authoritativeSource = await getMealPlanGrocerySource(
    supabase,
    parsed.weekStartDate
  );
  const { data, error } = await supabase.rpc(
    "create_grocery_list_with_items",
    {
      p_items: toGeneratedGroceryListRpcItems(
        authoritativeSource.generatedItems
      ),
      p_meal_plan_id: authoritativeSource.mealPlanId,
      p_source_type: "meal_plan",
      p_source_week_start_date: authoritativeSource.weekStartDate,
      p_title: parsed.title
    } as never
  );

  if (error) {
    if (isLinkedMealPlanGroceryListConflict(error)) {
      const ownerId = await getAuthenticatedGroceryListOwnerId(supabase);
      const linkedGroceryListId = await findLinkedMealPlanGroceryListId(
        supabase,
        ownerId,
        authoritativeSource.weekStartDate
      );
      if (linkedGroceryListId) {
        return linkedGroceryListId;
      }
    }

    throwMealPlanRpcError(error);
  }

  if (!data) {
    throw new Error("The grocery list was not created.");
  }

  return data as string;
}

export async function refreshGroceryListFromWeek(
  supabase: SupabaseBrowserClient,
  input: RefreshGroceryListFromWeekInput
) {
  if (!isUuid(input.groceryListId)) {
    throw new GroceryListMealPlanUnavailableError();
  }

  const ownerId = await getAuthenticatedGroceryListOwnerId(supabase);
  const { data, error } = await supabase
    .from("grocery_lists")
    .select(LINKED_MEAL_PLAN_GROCERY_SOURCE_SELECT)
    .eq("id", input.groceryListId)
    .eq("owner_id", ownerId)
    .eq("source_type", "meal_plan")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const linkedList = data as unknown as LinkedMealPlanGrocerySourceRow | null;
  if (
    !linkedList?.meal_plan_id ||
    !linkedList.meal_plans ||
    linkedList.meal_plans.id !== linkedList.meal_plan_id
  ) {
    throw new GroceryListMealPlanUnavailableError();
  }

  const authoritativeSource = toAvailableMealPlanGrocerySource(
    linkedList.meal_plans,
    true
  );
  const { error: refreshError } = await supabase.rpc(
    "refresh_grocery_list_from_meal_plan",
    {
      p_generated_items: toGeneratedGroceryListRpcItems(
        authoritativeSource.generatedItems
      ),
      p_grocery_list_id: input.groceryListId
    } as never
  );

  if (refreshError) {
    throwMealPlanRpcError(refreshError);
  }
}
