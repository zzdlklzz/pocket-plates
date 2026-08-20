import {
  getWeekDates,
  isDateInWeek,
  parseIsoDate
} from "./meal-planning.dates";
import type {
  IsoDate,
  MealPlanEntryDto,
  MealType
} from "./meal-planning.types";

export type CopiedMealPlanEntry = {
  mealType: MealType;
  recipeId: string;
  servings: number;
};

export type MealPlanCopyBuffer =
  | {
      entries: CopiedMealPlanEntry[];
      kind: "day";
    }
  | {
      entries: (CopiedMealPlanEntry & { dayOffset: number })[];
      kind: "week";
    };

export type MealPlanPasteEntry = CopiedMealPlanEntry & {
  plannedFor: IsoDate;
};

export type MealPlanPasteInput = {
  entries: MealPlanPasteEntry[];
  weekStartDate: IsoDate;
};

export type MealPlanPastePreview = {
  archivedCount: number;
  deletedCount: number;
  eligibleCount: number;
  exactDuplicateCount: number;
};

export type MealPlanPasteResult = Omit<MealPlanPastePreview, "eligibleCount"> & {
  addedCount: number;
};

export type MealPlanRecipeAvailability = {
  recipeId: string;
  status: "active" | "archived" | "unavailable";
};

export type ExistingMealPlanEntry = Pick<
  MealPlanPasteEntry,
  "mealType" | "plannedFor" | "recipeId"
>;

export type MealPlanPasteClassification = MealPlanPastePreview & {
  eligibleEntries: MealPlanPasteEntry[];
};

function toCopiedEntry(entry: MealPlanEntryDto): CopiedMealPlanEntry {
  return {
    mealType: entry.mealType,
    recipeId: entry.recipe.id,
    servings: entry.servings
  };
}

function requireMonday(weekStartDate: IsoDate) {
  const weekDates = getWeekDates(weekStartDate);

  if (weekDates[0] !== weekStartDate) {
    throw new Error("Week start date must be a Monday.");
  }

  return weekDates;
}

export function createDayCopyBuffer(
  entries: MealPlanEntryDto[],
  sourceDay: IsoDate
): MealPlanCopyBuffer {
  if (!parseIsoDate(sourceDay)) {
    throw new Error("Copy day must be a valid date.");
  }

  return {
    entries: entries
      .filter(
        (entry) =>
          entry.plannedFor === sourceDay && !entry.recipe.archived
      )
      .map(toCopiedEntry),
    kind: "day"
  };
}

export function createWeekCopyBuffer(
  entries: MealPlanEntryDto[],
  sourceWeekStart: IsoDate
): MealPlanCopyBuffer {
  const weekDates = requireMonday(sourceWeekStart);

  return {
    entries: entries.flatMap((entry) => {
      const dayOffset = weekDates.indexOf(entry.plannedFor);

      return dayOffset < 0 || entry.recipe.archived
        ? []
        : [{ ...toCopiedEntry(entry), dayOffset }];
    }),
    kind: "week"
  };
}

export function mapMealPlanCopyBuffer(
  buffer: MealPlanCopyBuffer,
  target: { targetDate?: IsoDate; weekStartDate: IsoDate }
): MealPlanPasteEntry[] {
  const weekDates = requireMonday(target.weekStartDate);

  if (buffer.kind === "day") {
    if (
      !target.targetDate ||
      !isDateInWeek(target.targetDate, target.weekStartDate)
    ) {
      throw new Error("Choose a target day within the selected week.");
    }

    return buffer.entries.map((entry) => ({
      ...entry,
      plannedFor: target.targetDate as IsoDate
    }));
  }

  return buffer.entries.map(({ dayOffset, ...entry }) => {
    const plannedFor = weekDates[dayOffset];

    if (!plannedFor) {
      throw new Error("Copied week contains an invalid day offset.");
    }

    return { ...entry, plannedFor };
  });
}

function exactEntryKey(entry: ExistingMealPlanEntry) {
  return `${entry.plannedFor}|${entry.mealType}|${entry.recipeId}`;
}

export function classifyMealPlanPaste(
  entries: MealPlanPasteEntry[],
  targetEntries: ExistingMealPlanEntry[],
  recipeAvailability: MealPlanRecipeAvailability[]
): MealPlanPasteClassification {
  const availabilityByRecipeId = new Map(
    recipeAvailability.map(({ recipeId, status }) => [recipeId, status])
  );
  const exactKeys = new Set(targetEntries.map(exactEntryKey));
  const eligibleEntries: MealPlanPasteEntry[] = [];
  let archivedCount = 0;
  let deletedCount = 0;
  let exactDuplicateCount = 0;

  for (const entry of entries) {
    const status = availabilityByRecipeId.get(entry.recipeId);

    if (status === "archived") {
      archivedCount += 1;
      continue;
    }

    if (status !== "active") {
      deletedCount += 1;
      continue;
    }

    const key = exactEntryKey(entry);
    if (exactKeys.has(key)) {
      exactDuplicateCount += 1;
      continue;
    }

    exactKeys.add(key);
    eligibleEntries.push(entry);
  }

  return {
    archivedCount,
    deletedCount,
    eligibleCount: eligibleEntries.length,
    eligibleEntries,
    exactDuplicateCount
  };
}
