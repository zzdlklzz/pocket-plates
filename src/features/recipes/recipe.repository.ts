import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { removeRecipeImage, removeRecipeImages, uploadRecipeImage } from "./recipe-image.repository";
import { replaceRecipeDiscoveryMetadata } from "./recipe-discovery.repository";
import type { RecipeDetailRow, RecipeListRow } from "./recipe.mappers";
import type {
  CostRating,
  EquipmentPresetKey,
  MealType,
  RecipeEffortLabel,
  RecipeFormValues,
  RecipeImageChange,
  RecipeListFilters
} from "./recipe.types";
import { parseIngredientAmount } from "./recipe.validation";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type RecipeUpdate = Database["public"]["Tables"]["recipes"]["Update"];
type RecipeMealTypeInsert = Database["public"]["Tables"]["recipe_meal_types"]["Insert"];
type RecipeIngredientInsert = Database["public"]["Tables"]["recipe_ingredients"]["Insert"];
type RecipeStepInsert = Database["public"]["Tables"]["recipe_steps"]["Insert"];
type RecipeLinkInsert = Database["public"]["Tables"]["recipe_links"]["Insert"];

const RECIPE_LIST_SELECT = "id,title,cost_rating,difficulty,image_storage_path,image_url,created_at,recipe_meal_types(meal_type)";
const RECIPE_DETAIL_SELECT =
  "id,title,cost_rating,difficulty,image_storage_path,image_url,source_url,notes,servings,created_at,recipe_meal_types(meal_type),recipe_effort_labels(effort_label),recipe_equipment(equipment(preset_key)),recipe_links(label,url,sort_order),recipe_ingredients(name,amount,unit,notes,sort_order),recipe_steps(instruction,sort_order)";

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getMealTypeFilterValues(selectedMealTypes: MealType[]) {
  const selected = new Set(selectedMealTypes);
  const hasAnySpecificMealType = selectedMealTypes.some((mealType) => mealType !== "flexible");

  if (hasAnySpecificMealType) {
    selected.add("flexible");
  }

  return Array.from(selected);
}

function normalizeFilterValues<T extends string>(values?: T[]) {
  return values?.length ? Array.from(new Set(values)).sort() : undefined;
}

export function normalizeRecipeListFilters(filters: RecipeListFilters): RecipeListFilters {
  return {
    search: filters.search?.trim() || undefined,
    mealTypes: normalizeFilterValues<MealType>(filters.mealTypes),
    costRatings: normalizeFilterValues<CostRating>(filters.costRatings),
    difficulty: filters.difficulty,
    effortLabels: normalizeFilterValues<RecipeEffortLabel>(filters.effortLabels),
    equipmentKeys: normalizeFilterValues<EquipmentPresetKey>(filters.equipmentKeys)
  };
}

export async function listRecipes(
  supabase: SupabaseBrowserClient,
  filters: RecipeListFilters
) {
  const normalizedFilters = normalizeRecipeListFilters(filters);
  const { data, error } = await supabase.rpc(
    "list_private_library_recipes",
    // The @supabase/ssr browser client currently narrows generated RPC arguments to never.
    {
      p_search: normalizedFilters.search ?? null,
      p_meal_types: normalizedFilters.mealTypes
        ? getMealTypeFilterValues(normalizedFilters.mealTypes)
        : null,
      p_cost_ratings: normalizedFilters.costRatings ?? null,
      p_difficulty: normalizedFilters.difficulty ?? null,
      p_effort_labels: normalizedFilters.effortLabels ?? null,
      p_equipment_keys: normalizedFilters.equipmentKeys ?? null
    } as never
  );

  if (error) {
    throw error;
  }

  return data as RecipeListRow[];
}

export async function listArchivedRecipes(supabase: SupabaseBrowserClient) {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_LIST_SELECT)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as RecipeListRow[];
}

export async function getRecipe(supabase: SupabaseBrowserClient, id: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_DETAIL_SELECT)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as RecipeDetailRow | null;
}

async function replaceRecipeChildren(supabase: SupabaseBrowserClient, recipeId: string, values: RecipeFormValues) {
  const [{ error: mealDeleteError }, { error: linkDeleteError }, { error: ingredientDeleteError }, { error: stepDeleteError }] = await Promise.all([
    supabase.from("recipe_meal_types").delete().eq("recipe_id", recipeId),
    supabase.from("recipe_links").delete().eq("recipe_id", recipeId),
    supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId),
    supabase.from("recipe_steps").delete().eq("recipe_id", recipeId)
  ]);

  if (mealDeleteError) throw mealDeleteError;
  if (linkDeleteError) throw linkDeleteError;
  if (ingredientDeleteError) throw ingredientDeleteError;
  if (stepDeleteError) throw stepDeleteError;

  const mealRows: RecipeMealTypeInsert[] = values.mealTypes.map((mealType) => ({
    meal_type: mealType,
    recipe_id: recipeId
  }));
  const ingredientRows: RecipeIngredientInsert[] = values.ingredients.map((ingredient, sortOrder) => ({
    recipe_id: recipeId,
    name: ingredient.name.trim(),
    amount: parseIngredientAmount(ingredient.amount),
    unit: emptyToNull(ingredient.unit),
    notes: emptyToNull(ingredient.notes),
    sort_order: sortOrder
  }));
  const linkRows: RecipeLinkInsert[] = values.sourceLinks.map((link, sortOrder) => ({
    recipe_id: recipeId,
    label: emptyToNull(link.label),
    url: link.url.trim(),
    sort_order: sortOrder
  }));
  const stepRows: RecipeStepInsert[] = values.steps.map((step, sortOrder) => ({
    recipe_id: recipeId,
    instruction: step.instruction.trim(),
    timer_minutes: null,
    sort_order: sortOrder
  }));

  const [{ error: mealInsertError }, { error: linkInsertError }, { error: ingredientInsertError }, { error: stepInsertError }] = await Promise.all([
    // The @supabase/ssr browser client currently narrows table write payloads to never.
    supabase.from("recipe_meal_types").insert(mealRows as never[]),
    linkRows.length ? supabase.from("recipe_links").insert(linkRows as never[]) : Promise.resolve({ error: null }),
    supabase.from("recipe_ingredients").insert(ingredientRows as never[]),
    supabase.from("recipe_steps").insert(stepRows as never[])
  ]);

  if (mealInsertError) throw mealInsertError;
  if (linkInsertError) throw linkInsertError;
  if (ingredientInsertError) throw ingredientInsertError;
  if (stepInsertError) throw stepInsertError;
}

function toRecipeRow(values: RecipeFormValues, ownerId: string): RecipeInsert;
function toRecipeRow(values: RecipeFormValues): RecipeUpdate;
function toRecipeRow(values: RecipeFormValues, ownerId?: string): RecipeInsert | RecipeUpdate {
  return {
    ...(ownerId ? { owner_id: ownerId } : {}),
    title: values.title.trim(),
    servings: values.servings,
    cost_rating: values.costRating || null,
    difficulty: values.difficulty || null,
    source_url: null,
    notes: emptyToNull(values.notes)
  };
}

async function replaceRecipeImage(
  supabase: SupabaseBrowserClient,
  recipeId: string,
  ownerId: string,
  currentStoragePath: string | null,
  imageChange: RecipeImageChange
) {
  if (imageChange.type === "keep") {
    return;
  }

  let nextStoragePath: string | null = null;

  if (imageChange.type === "replace") {
    nextStoragePath = await uploadRecipeImage(supabase, ownerId, recipeId, imageChange.file);
  }

  const { error } = await supabase
    .from("recipes")
    .update({ image_storage_path: nextStoragePath, image_url: null } as never)
    .eq("id", recipeId);

  if (error) {
    if (nextStoragePath) {
      await removeRecipeImage(supabase, nextStoragePath).catch(() => undefined);
    }
    throw error;
  }

  if (currentStoragePath && currentStoragePath !== nextStoragePath) {
    await removeRecipeImage(supabase, currentStoragePath).catch(() => undefined);
  }
}

export async function createRecipe(
  supabase: SupabaseBrowserClient,
  values: RecipeFormValues,
  imageChange: RecipeImageChange
) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in to create a recipe.");
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert([toRecipeRow(values, user.id)] as never[])
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const createdRecipe = data as { id: string } | null;
  if (!createdRecipe) {
    throw new Error("Recipe was not created.");
  }

  try {
    await replaceRecipeChildren(supabase, createdRecipe.id, values);
    await replaceRecipeDiscoveryMetadata(
      supabase,
      createdRecipe.id,
      values.effortLabels,
      values.equipmentKeys
    );
    await replaceRecipeImage(supabase, createdRecipe.id, user.id, null, imageChange);
  } catch (error) {
    await supabase.from("recipes").delete().eq("id", createdRecipe.id);
    throw error;
  }

  return createdRecipe.id;
}

export async function updateRecipe(
  supabase: SupabaseBrowserClient,
  id: string,
  values: RecipeFormValues,
  imageChange: RecipeImageChange
) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in to update a recipe.");
  }

  const { data: currentRecipe, error: currentRecipeError } = await supabase
    .from("recipes")
    .select("image_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (currentRecipeError) {
    throw currentRecipeError;
  }

  if (!currentRecipe) {
    throw new Error("Recipe was not found.");
  }

  const { error } = await supabase.from("recipes").update(toRecipeRow(values) as never).eq("id", id);

  if (error) {
    throw error;
  }

  await replaceRecipeChildren(supabase, id, values);
  await replaceRecipeDiscoveryMetadata(supabase, id, values.effortLabels, values.equipmentKeys);
  await replaceRecipeImage(
    supabase,
    id,
    user.id,
    (currentRecipe as { image_storage_path: string | null }).image_storage_path,
    imageChange
  );
  return id;
}

export async function archiveRecipe(supabase: SupabaseBrowserClient, id: string) {
  const { error } = await supabase
    .from("recipes")
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function restoreRecipe(supabase: SupabaseBrowserClient, id: string) {
  const { error } = await supabase
    .from("recipes")
    .update({ archived_at: null } as never)
    .eq("id", id)
    .not("archived_at", "is", null);

  if (error) {
    throw error;
  }
}

export async function deleteArchivedRecipes(supabase: SupabaseBrowserClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return;
  }

  const { data, error: lookupError } = await supabase
    .from("recipes")
    .select("id,image_storage_path")
    .in("id", uniqueIds)
    .not("archived_at", "is", null);

  if (lookupError) {
    throw lookupError;
  }

  const archivedRecipes = data as { id: string; image_storage_path: string | null }[];

  if (archivedRecipes.length === 0) {
    return;
  }

  const archivedIds = archivedRecipes.map(({ id }) => id);
  const { data: deletedRows, error: deleteError } = await supabase
    .from("recipes")
    .delete()
    .in("id", archivedIds)
    .not("archived_at", "is", null)
    .select("id");

  if (deleteError) {
    throw deleteError;
  }

  const deletedIds = new Set(((deletedRows ?? []) as { id: string }[]).map(({ id }) => id));
  const storagePaths = archivedRecipes.flatMap(({ id, image_storage_path: storagePath }) =>
    deletedIds.has(id) && storagePath ? [storagePath] : []
  );
  await removeRecipeImages(supabase, storagePaths).catch(() => undefined);
}
