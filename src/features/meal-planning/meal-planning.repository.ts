import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  MAX_MEAL_PLAN_PASTE_ENTRIES,
  MAX_PLANNED_SERVINGS,
  MEAL_TYPE_VALUES
} from "./meal-planning.constants";
import {
  classifyMealPlanPaste,
  type ExistingMealPlanEntry,
  type MealPlanPasteInput,
  type MealPlanPastePreview,
  type MealPlanPasteResult,
  type MealPlanRecipeAvailability
} from "./meal-planning.copy";
import {
  getWeekStart,
  isDateInWeek,
  parseIsoDate
} from "./meal-planning.dates";
import type {
  AddMealPlanEntryInput,
  IsoDate,
  MealPlanEntryDto,
  MealPlanRecipeOptionDto,
  MealPlanWeekDto,
  MealType,
  RemoveMealPlanEntryInput,
  RemovedMealPlanEntry,
  UpdateMealPlanEntryInput
} from "./meal-planning.types";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
type MealPlanInsert = Database["public"]["Tables"]["meal_plans"]["Insert"];
type MealPlanEntryInsert = Database["public"]["Tables"]["meal_plan_entries"]["Insert"];

type MealPlanWeekRow = {
  id: string;
  meal_plan_entries: MealPlanEntryRow[] | null;
  week_start_date: string;
};

type MealPlanEntryRow = {
  id: string;
  meal_plan_id: string;
  meal_type: MealType;
  planned_for: string;
  recipe_id: string;
  recipes: {
    archived_at: string | null;
    id: string;
    servings: number;
    title: string;
  } | null;
  servings: number;
};

type InsertedMealPlanEntryRow = Omit<MealPlanEntryRow, "recipes">;

type EditableMealPlanEntryRow = {
  meal_plan_id: string;
  meal_plans: { week_start_date: string } | null;
};

type OwnedRecipeRow = {
  archived_at: string | null;
  id: string;
  servings: number;
  title: string;
};

type MealPlanRecipeOptionRow = {
  id: string;
  recipe_ingredients: { name: string }[] | null;
  recipe_meal_types: { meal_type: MealType }[] | null;
  servings: number;
  title: string;
};

type PasteRecipeRow = {
  archived_at: string | null;
  id: string;
};

type PasteTargetPlanRow = {
  id: string;
  meal_plan_entries: {
    meal_type: MealType;
    planned_for: string;
    recipe_id: string;
  }[] | null;
};

const MEAL_PLAN_WEEK_SELECT =
  "id,week_start_date,meal_plan_entries(id,meal_plan_id,recipe_id,planned_for,meal_type,servings,recipes(id,title,servings,archived_at))";

const MEAL_PLAN_ENTRY_SELECT =
  "id,meal_plan_id,recipe_id,planned_for,meal_type,servings";

const EDITABLE_MEAL_PLAN_ENTRY_SELECT =
  "meal_plan_id,meal_plans(week_start_date)";
const UPDATED_MEAL_PLAN_ENTRY_SELECT = `${MEAL_PLAN_ENTRY_SELECT},recipes(id,title,servings,archived_at)`;

export class DuplicateMealPlanEntryError extends Error {
  constructor() {
    super("This recipe is already planned for that meal.");
    this.name = "DuplicateMealPlanEntryError";
  }
}

function assertMonday(weekStartDate: IsoDate) {
  const date = parseIsoDate(weekStartDate);

  if (!date || getWeekStart(date) !== weekStartDate) {
    throw new Error("Week start date must be a valid Monday.");
  }
}

function validateEntryValues(
  input: Pick<
    AddMealPlanEntryInput,
    "mealType" | "plannedFor" | "servings" | "weekStartDate"
  >
) {
  assertMonday(input.weekStartDate);

  if (!isDateInWeek(input.plannedFor, input.weekStartDate)) {
    throw new Error("Planned date must be within the selected week.");
  }

  if (!MEAL_TYPE_VALUES.includes(input.mealType)) {
    throw new Error("Choose a valid meal type.");
  }

  if (
    !Number.isInteger(input.servings) ||
    input.servings < 1 ||
    input.servings > MAX_PLANNED_SERVINGS
  ) {
    throw new Error(
      `Servings must be a whole number from 1 to ${MAX_PLANNED_SERVINGS}.`
    );
  }
}

function validatePasteInput(input: MealPlanPasteInput) {
  assertMonday(input.weekStartDate);

  if (input.entries.length > MAX_MEAL_PLAN_PASTE_ENTRIES) {
    throw new Error(
      `Paste no more than ${MAX_MEAL_PLAN_PASTE_ENTRIES} meals at once.`
    );
  }

  for (const entry of input.entries) {
    validateEntryValues({ ...entry, weekStartDate: input.weekStartDate });
  }
}

function mapEntry(row: MealPlanEntryRow): MealPlanEntryDto | null {
  if (!row.recipes || !parseIsoDate(row.planned_for)) {
    return null;
  }

  return {
    id: row.id,
    mealType: row.meal_type,
    planId: row.meal_plan_id,
    plannedFor: row.planned_for as IsoDate,
    recipe: {
      archived: row.recipes.archived_at !== null,
      id: row.recipes.id,
      servings: row.recipes.servings,
      title: row.recipes.title
    },
    servings: row.servings
  };
}

function sortEntries(entries: MealPlanEntryDto[]) {
  const mealTypeOrder = new Map(
    MEAL_TYPE_VALUES.map((mealType, index) => [mealType, index])
  );

  return entries.sort(
    (left, right) =>
      left.plannedFor.localeCompare(right.plannedFor) ||
      (mealTypeOrder.get(left.mealType) ?? 0) -
        (mealTypeOrder.get(right.mealType) ?? 0) ||
      left.recipe.title.localeCompare(right.recipe.title) ||
      left.id.localeCompare(right.id)
  );
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
    throw new Error("You must be signed in to plan a meal.");
  }

  return user.id;
}

async function getPasteRecipeAvailability(
  supabase: SupabaseBrowserClient,
  ownerId: string,
  recipeIds: string[]
): Promise<MealPlanRecipeAvailability[]> {
  const uniqueRecipeIds = Array.from(new Set(recipeIds));

  if (!uniqueRecipeIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("id,archived_at")
    .eq("owner_id", ownerId)
    .in("id", uniqueRecipeIds);

  if (error) {
    throw error;
  }

  const recipesById = new Map(
    ((data ?? []) as PasteRecipeRow[]).map((recipe) => [recipe.id, recipe])
  );

  return uniqueRecipeIds.map((recipeId) => {
    const recipe = recipesById.get(recipeId);

    return {
      recipeId,
      status: !recipe
        ? "unavailable"
        : recipe.archived_at
          ? "archived"
          : "active"
    };
  });
}

async function getPasteTarget(
  supabase: SupabaseBrowserClient,
  weekStartDate: IsoDate
): Promise<{ entries: ExistingMealPlanEntry[]; planId: string | null }> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id,meal_plan_entries(recipe_id,planned_for,meal_type)")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const plan = data as unknown as PasteTargetPlanRow | null;

  return {
    entries: (plan?.meal_plan_entries ?? []).flatMap((entry) =>
      parseIsoDate(entry.planned_for)
        ? [
            {
              mealType: entry.meal_type,
              plannedFor: entry.planned_for as IsoDate,
              recipeId: entry.recipe_id
            }
          ]
        : []
    ),
    planId: plan?.id ?? null
  };
}

async function getOwnedRecipe(
  supabase: SupabaseBrowserClient,
  recipeId: string,
  ownerId: string,
  activeOnly: boolean
) {
  const query = supabase
    .from("recipes")
    .select("id,title,servings,archived_at")
    .eq("id", recipeId)
    .eq("owner_id", ownerId);
  const { data, error } = activeOnly
    ? await query.is("archived_at", null).maybeSingle()
    : await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      activeOnly
        ? "Choose an active recipe from your library."
        : "The removed recipe is no longer available."
    );
  }

  return data as OwnedRecipeRow;
}

async function resolveMealPlanId(
  supabase: SupabaseBrowserClient,
  ownerId: string,
  weekStartDate: IsoDate
) {
  const row: MealPlanInsert = {
    owner_id: ownerId,
    week_start_date: weekStartDate
  };
  const { data, error } = await supabase
    .from("meal_plans")
    .upsert([row] as never[], { onConflict: "owner_id,week_start_date" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const plan = data as { id: string } | null;
  if (!plan) {
    throw new Error("Meal plan was not created.");
  }

  return plan.id;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function insertMealPlanEntry(
  supabase: SupabaseBrowserClient,
  input: AddMealPlanEntryInput,
  ownerId: string,
  recipe: OwnedRecipeRow
): Promise<MealPlanEntryDto> {
  const planId = await resolveMealPlanId(
    supabase,
    ownerId,
    input.weekStartDate
  );
  const row: MealPlanEntryInsert = {
    meal_plan_id: planId,
    meal_type: input.mealType,
    planned_for: input.plannedFor,
    recipe_id: input.recipeId,
    servings: input.servings
  };
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .insert([row] as never[])
    .select(MEAL_PLAN_ENTRY_SELECT)
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateMealPlanEntryError();
    }

    throw error;
  }

  const entry = data as InsertedMealPlanEntryRow | null;
  if (!entry) {
    throw new Error("Meal was not added to the plan.");
  }

  return {
    id: entry.id,
    mealType: entry.meal_type,
    planId: entry.meal_plan_id,
    plannedFor: entry.planned_for as IsoDate,
    recipe: {
      archived: recipe.archived_at !== null,
      id: recipe.id,
      servings: recipe.servings,
      title: recipe.title
    },
    servings: entry.servings
  };
}

export async function getMealPlanWeek(
  supabase: SupabaseBrowserClient,
  weekStartDate: IsoDate
): Promise<MealPlanWeekDto> {
  assertMonday(weekStartDate);

  const { data, error } = await supabase
    .from("meal_plans")
    .select(MEAL_PLAN_WEEK_SELECT)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { entries: [], planId: null, weekStartDate };
  }

  const plan = data as unknown as MealPlanWeekRow;
  const entries = (plan.meal_plan_entries ?? [])
    .map(mapEntry)
    .filter((entry): entry is MealPlanEntryDto => entry !== null);

  return {
    entries: sortEntries(entries),
    planId: plan.id,
    weekStartDate
  };
}

export async function listMealPlanRecipeOptions(
  supabase: SupabaseBrowserClient
): Promise<MealPlanRecipeOptionDto[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id,title,servings,recipe_meal_types(meal_type),recipe_ingredients(name)"
    )
    .is("archived_at", null)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MealPlanRecipeOptionRow[]).map((recipe) => ({
    archived: false,
    id: recipe.id,
    ingredientNames:
      recipe.recipe_ingredients?.map(({ name }) => name) ?? [],
    mealTypes:
      recipe.recipe_meal_types?.map(({ meal_type }) => meal_type) ?? [],
    servings: recipe.servings,
    title: recipe.title
  }));
}

export async function addMealPlanEntry(
  supabase: SupabaseBrowserClient,
  input: AddMealPlanEntryInput
): Promise<MealPlanEntryDto> {
  validateEntryValues(input);

  const ownerId = await getAuthenticatedOwnerId(supabase);
  const recipe = await getOwnedRecipe(
    supabase,
    input.recipeId,
    ownerId,
    true
  );

  return insertMealPlanEntry(supabase, input, ownerId, recipe);
}

export async function restoreMealPlanEntry(
  supabase: SupabaseBrowserClient,
  input: RemovedMealPlanEntry
): Promise<MealPlanEntryDto> {
  validateEntryValues(input);

  const ownerId = await getAuthenticatedOwnerId(supabase);
  const recipe = await getOwnedRecipe(
    supabase,
    input.recipeId,
    ownerId,
    false
  );

  return insertMealPlanEntry(supabase, input, ownerId, recipe);
}

export async function updateMealPlanEntry(
  supabase: SupabaseBrowserClient,
  input: UpdateMealPlanEntryInput
): Promise<MealPlanEntryDto> {
  validateEntryValues(input);

  const { data: currentData, error: currentError } = await supabase
    .from("meal_plan_entries")
    .select(EDITABLE_MEAL_PLAN_ENTRY_SELECT)
    .eq("id", input.entryId)
    .maybeSingle();

  if (currentError) {
    throw currentError;
  }

  const currentEntry = currentData as unknown as EditableMealPlanEntryRow | null;
  if (
    !currentEntry ||
    currentEntry.meal_plans?.week_start_date !== input.weekStartDate
  ) {
    throw new Error("Meal plan entry was not found in the selected week.");
  }

  const { data, error } = await supabase
    .from("meal_plan_entries")
    .update({
      meal_type: input.mealType,
      planned_for: input.plannedFor,
      servings: input.servings
    } as never)
    .eq("id", input.entryId)
    .eq("meal_plan_id", currentEntry.meal_plan_id)
    .select(UPDATED_MEAL_PLAN_ENTRY_SELECT)
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateMealPlanEntryError();
    }

    throw error;
  }

  const updatedEntry = data as unknown as MealPlanEntryRow | null;
  const mappedEntry = updatedEntry ? mapEntry(updatedEntry) : null;

  if (!mappedEntry) {
    throw new Error("Meal plan entry was not found.");
  }

  return mappedEntry;
}

export async function previewMealPlanEntries(
  supabase: SupabaseBrowserClient,
  input: MealPlanPasteInput
): Promise<MealPlanPastePreview> {
  validatePasteInput(input);

  if (!input.entries.length) {
    return {
      archivedCount: 0,
      deletedCount: 0,
      eligibleCount: 0,
      exactDuplicateCount: 0
    };
  }

  const ownerId = await getAuthenticatedOwnerId(supabase);
  const [recipeAvailability, target] = await Promise.all([
    getPasteRecipeAvailability(
      supabase,
      ownerId,
      input.entries.map(({ recipeId }) => recipeId)
    ),
    getPasteTarget(supabase, input.weekStartDate)
  ]);
  const classification = classifyMealPlanPaste(
    input.entries,
    target.entries,
    recipeAvailability
  );

  return {
    archivedCount: classification.archivedCount,
    deletedCount: classification.deletedCount,
    eligibleCount: classification.eligibleCount,
    exactDuplicateCount: classification.exactDuplicateCount
  };
}

export async function addMealPlanEntries(
  supabase: SupabaseBrowserClient,
  input: MealPlanPasteInput
): Promise<MealPlanPasteResult> {
  validatePasteInput(input);

  if (!input.entries.length) {
    return {
      addedCount: 0,
      archivedCount: 0,
      deletedCount: 0,
      exactDuplicateCount: 0
    };
  }

  const ownerId = await getAuthenticatedOwnerId(supabase);
  const [recipeAvailability, target] = await Promise.all([
    getPasteRecipeAvailability(
      supabase,
      ownerId,
      input.entries.map(({ recipeId }) => recipeId)
    ),
    getPasteTarget(supabase, input.weekStartDate)
  ]);
  const classification = classifyMealPlanPaste(
    input.entries,
    target.entries,
    recipeAvailability
  );

  if (!classification.eligibleEntries.length) {
    return {
      addedCount: 0,
      archivedCount: classification.archivedCount,
      deletedCount: classification.deletedCount,
      exactDuplicateCount: classification.exactDuplicateCount
    };
  }

  const planId =
    target.planId ??
    (await resolveMealPlanId(supabase, ownerId, input.weekStartDate));
  const rows: MealPlanEntryInsert[] = classification.eligibleEntries.map(
    (entry) => ({
      meal_plan_id: planId,
      meal_type: entry.mealType,
      planned_for: entry.plannedFor,
      recipe_id: entry.recipeId,
      servings: entry.servings
    })
  );
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .upsert(rows as never[], {
      ignoreDuplicates: true,
      onConflict: "meal_plan_id,planned_for,meal_type,recipe_id"
    })
    .select("id");

  if (error) {
    throw error;
  }

  const addedCount = (data ?? []).length;

  return {
    addedCount,
    archivedCount: classification.archivedCount,
    deletedCount: classification.deletedCount,
    exactDuplicateCount:
      classification.exactDuplicateCount +
      classification.eligibleEntries.length -
      addedCount
  };
}

export async function removeMealPlanEntry(
  supabase: SupabaseBrowserClient,
  input: RemoveMealPlanEntryInput
): Promise<RemovedMealPlanEntry> {
  assertMonday(input.weekStartDate);

  const { data, error } = await supabase
    .from("meal_plan_entries")
    .delete()
    .eq("id", input.entryId)
    .select("recipe_id,planned_for,meal_type,servings")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const entry = data as {
    meal_type: MealType;
    planned_for: string;
    recipe_id: string;
    servings: number;
  } | null;

  if (!entry || !parseIsoDate(entry.planned_for)) {
    throw new Error("Meal plan entry was not found.");
  }

  return {
    mealType: entry.meal_type,
    plannedFor: entry.planned_for as IsoDate,
    recipeId: entry.recipe_id,
    servings: entry.servings,
    weekStartDate: getWeekStart(parseIsoDate(entry.planned_for)!)
  };
}
