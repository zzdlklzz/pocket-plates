import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  DuplicateGroceryListItemError,
  GroceryListAuthenticationError,
  GroceryListItemLimitError,
  GroceryListNotFoundError,
  GroceryListRecipeUnavailableError
} from "./grocery-list.errors";
import {
  toGeneratedGroceryListRpcItems,
  toGroceryListDetailDto,
  toGroceryListGenerationRecipeInput,
  toGroceryListRecipeOptionDto,
  toGroceryListSummaryDto,
  type GroceryListDetailRow,
  type GroceryListGenerationRecipeRow,
  type GroceryListRecipeOptionRow,
  type GroceryListSummaryRow
} from "./grocery-list.mappers";
import { generateGroceryListItems } from "./grocery-list.generation";
import type {
  AddGroceryListItemInput,
  CreateBlankGroceryListInput,
  CreateGeneratedGroceryListInput,
  DeleteGroceryListInput,
  RemoveGroceryListItemInput,
  RenameGroceryListInput,
  SelectedGroceryListRecipeInput,
  SetGroceryListItemCheckedInput,
  UpdateGroceryListItemInput
} from "./grocery-list.types";
import {
  isUuid,
  parseCreateGeneratedGroceryListInput,
  parseGroceryListItemValues,
  parseGroceryListTitle,
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
