import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  MAX_PLANNED_SERVINGS,
  MEAL_TYPE_VALUES
} from "./meal-planning.constants";
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
  RemovedMealPlanEntry
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

const MEAL_PLAN_WEEK_SELECT =
  "id,week_start_date,meal_plan_entries(id,meal_plan_id,recipe_id,planned_for,meal_type,servings,recipes(id,title,servings,archived_at))";

const MEAL_PLAN_ENTRY_SELECT =
  "id,meal_plan_id,recipe_id,planned_for,meal_type,servings";

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

function validateEntryInput(input: AddMealPlanEntryInput) {
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
  validateEntryInput(input);

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
  validateEntryInput(input);

  const ownerId = await getAuthenticatedOwnerId(supabase);
  const recipe = await getOwnedRecipe(
    supabase,
    input.recipeId,
    ownerId,
    false
  );

  return insertMealPlanEntry(supabase, input, ownerId, recipe);
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
