import type { Database } from "@/lib/supabase/database.types";
import {
  DuplicateGroceryListItemError,
  GroceryListNotFoundError
} from "./grocery-list.errors";
import {
  toGroceryListDetailDto,
  toGroceryListSummaryDto,
  type GroceryListDetailRow,
  type GroceryListSummaryRow
} from "./grocery-list.mappers";
import {
  getAuthenticatedGroceryListOwnerId,
  type SupabaseBrowserClient
} from "./grocery-list.repository-client";
import type {
  AddGroceryListItemInput,
  CreateBlankGroceryListInput,
  DeleteGroceryListInput,
  RemoveGroceryListItemInput,
  RenameGroceryListInput,
  ResetGroceryListChecklistInput,
  SetGroceryListItemCheckedInput,
  UpdateGroceryListItemInput
} from "./grocery-list.types";
import {
  isUuid,
  parseGroceryListItemValues,
  parseGroceryListTitle
} from "./grocery-list.validation";

type GroceryListInsert = Database["public"]["Tables"]["grocery_lists"]["Insert"];
type GroceryListItemInsert = Database["public"]["Tables"]["grocery_list_items"]["Insert"];
type GroceryListItemUpdate = Database["public"]["Tables"]["grocery_list_items"]["Update"];

const GROCERY_LIST_DETAIL_SELECT =
  "id,title,source_type,source_recipe_count,source_week_start_date,meal_plans(id),grocery_list_items(id,name,amount,unit,notes,is_manual,quantity_overridden,checked,sort_order,grocery_list_item_sources(id,recipe_id,recipe_ingredient_id,recipe_title,ingredient_name,ingredient_amount,ingredient_unit,ingredient_notes,saved_servings,target_servings,scale_factor,contributed_amount,canonical_unit,sort_order))";

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

export async function listGroceryLists(supabase: SupabaseBrowserClient) {
  const { data, error } = await supabase.rpc("list_grocery_lists");

  if (error) {
    throw error;
  }

  return ((data ?? []) as GroceryListSummaryRow[]).map(
    toGroceryListSummaryDto
  );
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
  const ownerId = await getAuthenticatedGroceryListOwnerId(supabase);
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
