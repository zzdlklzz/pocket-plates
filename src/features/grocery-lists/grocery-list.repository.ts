import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { IsoDate } from "@/features/meal-planning/meal-planning.types";
import {
  DuplicateGroceryListItemError,
  GroceryListAuthenticationError,
  GroceryListItemLimitError,
  GroceryListMealPlanUnavailableError,
  GroceryListNotFoundError,
  GroceryListRecipeUnavailableError
} from "./grocery-list.errors";
import {
  toGeneratedGroceryListRpcItems,
  toGroceryListDetailDto,
  toGroceryListGenerationRecipeInput,
  toGroceryListRecipeOptionDto,
  toGroceryListSummaryDto,
  toMealPlanGrocerySourceDto,
  type GroceryListDetailRow,
  type GroceryListGenerationRecipeRow,
  type GroceryListRecipeOptionRow,
  type GroceryListSummaryRow,
  type MealPlanGrocerySourceRow
} from "./grocery-list.mappers";
import { generateGroceryListItems } from "./grocery-list.generation";
import type {
  AddGroceryListItemInput,
  CreateBlankGroceryListInput,
  CreateGeneratedGroceryListInput,
  CreateMealPlanGroceryListInput,
  DeleteGroceryListInput,
  RemoveGroceryListItemInput,
  RenameGroceryListInput,
  ResetGroceryListChecklistInput,
  RefreshGroceryListFromWeekInput,
  SelectedGroceryListRecipeInput,
  SetGroceryListItemCheckedInput,
  UpdateGroceryListItemInput
} from "./grocery-list.types";
import {
  isUuid,
  parseCreateGeneratedGroceryListInput,
  parseCreateMealPlanGroceryListInput,
  parseGroceryListItemValues,
  parseGroceryListTitle,
  parseMealPlanGroceryWeekStart,
  parseSelectedGroceryListRecipes
} from "./grocery-list.validation";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type GroceryListInsert = Database["public"]["Tables"]["grocery_lists"]["Insert"];
type GroceryListItemInsert = Database["public"]["Tables"]["grocery_list_items"]["Insert"];
type GroceryListItemUpdate = Database["public"]["Tables"]["grocery_list_items"]["Update"];

const GROCERY_LIST_DETAIL_SELECT =
  "id,title,source_type,source_recipe_count,meal_plan_id,source_week_start_date,updated_at,meal_plans(id),grocery_list_items(id,name,amount,unit,notes,normalized_name,is_manual,quantity_overridden,checked,sort_order,grocery_list_item_sources(id,recipe_id,recipe_ingredient_id,recipe_title,ingredient_name,ingredient_amount,ingredient_unit,ingredient_notes,saved_servings,target_servings,scale_factor,contributed_amount,canonical_unit,sort_order))";
const GROCERY_LIST_GENERATION_RECIPE_SELECT =
  "id,title,servings,recipe_ingredients(id,name,amount,unit,notes,sort_order)";
const MEAL_PLAN_GROCERY_SOURCE_SELECT =
  "id,week_start_date,meal_plan_entries(id,recipe_id,planned_for,meal_type,servings,recipes(id,title,servings,archived_at,recipe_ingredients(id,name,amount,unit,notes,sort_order)))";
const LINKED_MEAL_PLAN_GROCERY_SOURCE_SELECT =
  `id,source_type,meal_plan_id,meal_plans(${MEAL_PLAN_GROCERY_SOURCE_SELECT})`;

type LinkedMealPlanGrocerySourceRow = {
  id: string;
  meal_plan_id: string | null;
  meal_plans: MealPlanGrocerySourceRow | null;
  source_type: "manual" | "recipes" | "meal_plan";
};

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function throwItemError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new DuplicateGroceryListItemError();
  }

  throw error;
}

function requireMutationRow<T>(row: T | null): T {
  if (!row) {
    throw new GroceryListNotFoundError();
  }

  return row;
}

function getDatabaseError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { code: "", message: "" };
  }

  const errorRecord = error as { code?: unknown; message?: unknown };
  return {
    code: String(errorRecord.code ?? ""),
    message: String(errorRecord.message ?? "").toLowerCase()
  };
}

function isStaleGeneratedSourceError(error: unknown) {
  const { message } = getDatabaseError(error);

  return [
    "source recipe is not available",
    "source ingredient is not available",
    "must include every recipe ingredient"
  ].some((candidate) => message.includes(candidate));
}

function isUnavailableMealPlanError(error: unknown) {
  const { message } = getDatabaseError(error);

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
  const databaseError = getDatabaseError(error);
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

async function getAuthenticatedOwnerId(supabase: SupabaseBrowserClient) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new GroceryListAuthenticationError();
  }

  return user.id;
}

export async function listGroceryLists(supabase: SupabaseBrowserClient) {
  const { data, error } = await supabase.rpc("list_grocery_lists");

  if (error) {
    throw error;
  }

  return ((data ?? []) as GroceryListSummaryRow[]).map(
    toGroceryListSummaryDto
  );
}

export async function listGroceryListRecipeOptions(
  supabase: SupabaseBrowserClient,
  search: string
) {
  await getAuthenticatedOwnerId(supabase);
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
  const ownerId = await getAuthenticatedOwnerId(supabase);
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
    const databaseError = getDatabaseError(error);
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

export async function getMealPlanGrocerySource(
  supabase: SupabaseBrowserClient,
  weekStartDate: IsoDate
) {
  const parsedWeekStart = parseMealPlanGroceryWeekStart(weekStartDate);
  const ownerId = await getAuthenticatedOwnerId(supabase);
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

  const ownerId = await getAuthenticatedOwnerId(supabase);
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

export async function getGroceryListDetail(
  supabase: SupabaseBrowserClient,
  groceryListId: string
) {
  if (!isUuid(groceryListId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("grocery_lists")
    .select(GROCERY_LIST_DETAIL_SELECT)
    .eq("id", groceryListId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? toGroceryListDetailDto(data as unknown as GroceryListDetailRow)
    : null;
}

export async function createBlankGroceryList(
  supabase: SupabaseBrowserClient,
  input: CreateBlankGroceryListInput
) {
  const ownerId = await getAuthenticatedOwnerId(supabase);
  const row: GroceryListInsert = {
    owner_id: ownerId,
    source_type: "manual",
    title: parseGroceryListTitle(input.title)
  };
  const { data, error } = await supabase
    .from("grocery_lists")
    .insert(row as never)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const createdList = data as { id: string } | null;
  if (!createdList) {
    throw new Error("The grocery list was not created.");
  }

  return createdList.id;
}

export async function renameGroceryList(
  supabase: SupabaseBrowserClient,
  input: RenameGroceryListInput
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .update({ title: parseGroceryListTitle(input.title) } as never)
    .eq("id", input.groceryListId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  requireMutationRow(data);
}

export async function deleteGroceryList(
  supabase: SupabaseBrowserClient,
  input: DeleteGroceryListInput
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .delete()
    .eq("id", input.groceryListId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  requireMutationRow(data);
}

export async function addGroceryListItem(
  supabase: SupabaseBrowserClient,
  input: AddGroceryListItemInput
) {
  const values = parseGroceryListItemValues(input.values);
  const { data: lastItem, error: lastItemError } = await supabase
    .from("grocery_list_items")
    .select("sort_order")
    .eq("grocery_list_id", input.groceryListId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) {
    throw lastItemError;
  }

  const row: GroceryListItemInsert = {
    ...values,
    grocery_list_id: input.groceryListId,
    is_manual: true,
    quantity_overridden: false,
    sort_order:
      ((lastItem as { sort_order: number } | null)?.sort_order ?? -1) + 1
  };
  const { data, error } = await supabase
    .from("grocery_list_items")
    .insert(row as never)
    .select("id")
    .single();

  if (error) {
    throwItemError(error);
  }

  const createdItem = data as { id: string } | null;
  if (!createdItem) {
    throw new Error("The grocery item was not created.");
  }

  return createdItem.id;
}

export async function updateGroceryListItem(
  supabase: SupabaseBrowserClient,
  input: UpdateGroceryListItemInput
) {
  const values = parseGroceryListItemValues(input.values);
  const row: GroceryListItemUpdate = {
    ...values,
    quantity_overridden: input.quantityOverridden
  };
  const { data, error } = await supabase
    .from("grocery_list_items")
    .update(row as never)
    .eq("id", input.itemId)
    .eq("grocery_list_id", input.groceryListId)
    .select("id")
    .maybeSingle();

  if (error) {
    throwItemError(error);
  }

  requireMutationRow(data);
}

export async function setGroceryListItemChecked(
  supabase: SupabaseBrowserClient,
  input: SetGroceryListItemCheckedInput
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .update({ checked: input.checked } as never)
    .eq("id", input.itemId)
    .eq("grocery_list_id", input.groceryListId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  requireMutationRow(data);
}

export async function resetGroceryListChecklist(
  supabase: SupabaseBrowserClient,
  input: ResetGroceryListChecklistInput
) {
  const { error } = await supabase
    .from("grocery_list_items")
    .update({ checked: false } as never)
    .eq("grocery_list_id", input.groceryListId)
    .eq("checked", true);

  if (error) {
    throw error;
  }
}

export async function removeGroceryListItem(
  supabase: SupabaseBrowserClient,
  input: RemoveGroceryListItemInput
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .delete()
    .eq("id", input.itemId)
    .eq("grocery_list_id", input.groceryListId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  requireMutationRow(data);
}
