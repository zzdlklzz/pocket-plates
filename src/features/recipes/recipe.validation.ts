import { z } from "zod";

export const MAX_RECIPE_TITLE_LENGTH = 120;
export const MAX_RECIPE_NOTES_LENGTH = 2000;
export const MAX_INGREDIENTS = 50;
export const MAX_INGREDIENT_NAME_LENGTH = 120;
export const MAX_INGREDIENT_NOTES_LENGTH = 180;
export const MAX_STEPS = 40;
export const MAX_STEP_INSTRUCTION_LENGTH = 1000;
export const MAX_SERVINGS = 100;
export const MAX_SOURCE_LINKS = 5;
export const MAX_SOURCE_LABEL_LENGTH = 100;

export const INGREDIENT_UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "tsp",
  "tbsp",
  "cup",
  "cups",
  "pcs",
  "clove",
  "slice",
  "can",
  "pack",
  "serving"
] as const;

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), "Use a full http or https URL.");

const optionalIngredientAmount = z
  .string()
  .trim()
  .refine((value) => value === "" || parseIngredientAmount(value) !== null, "Use a number or simple fraction, like 1, 1.5, 1/2, or 1 1/2.");

const optionalIngredientUnit = z.union([z.enum(INGREDIENT_UNITS), z.literal("")]);

const servingsSchema = z.preprocess(
  (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
  z
    .number({
      required_error: "Add servings.",
      invalid_type_error: "Servings must be a whole number."
    })
    .int("Servings must be a whole number.")
    .positive("Servings must be at least 1.")
    .max(MAX_SERVINGS, `Servings must be ${MAX_SERVINGS} or less.`)
);

export function parseIngredientAmount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numberValue = Number(trimmed);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return numberValue;
  }

  const mixedFractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);

    if (denominator > 0 && numerator > 0 && numerator < denominator) {
      return whole + numerator / denominator;
    }
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator > 0 && numerator > 0) {
      return numerator / denominator;
    }
  }

  return null;
}

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "Add a recipe title.").max(MAX_RECIPE_TITLE_LENGTH, `Keep the title under ${MAX_RECIPE_TITLE_LENGTH} characters.`),
  servings: servingsSchema,
  mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner", "snack", "flexible"])).min(1, "Choose at least one meal type."),
  costRating: z.union([z.enum(["very_cheap", "cheap", "moderate", "splurge"]), z.literal("")]),
  difficulty: z.union([z.enum(["easy", "medium", "hard", "beginner_friendly"]), z.literal("")]),
  imageUrl: optionalUrl,
  sourceLinks: z
    .array(
      z.object({
        label: z.string().trim().max(MAX_SOURCE_LABEL_LENGTH, `Keep source labels under ${MAX_SOURCE_LABEL_LENGTH} characters.`),
        url: z.string().trim().min(1, "Source URL is required.").url("Enter a full URL starting with http:// or https://.").refine(
          (value) => value.startsWith("http://") || value.startsWith("https://"),
          "Enter a full URL starting with http:// or https://."
        )
      })
    )
    .max(MAX_SOURCE_LINKS, `Add ${MAX_SOURCE_LINKS} sources or fewer.`)
    .superRefine((links, context) => {
      const seenUrls = new Set<string>();

      links.forEach((link, index) => {
        const normalizedUrl = link.url.trim();
        if (seenUrls.has(normalizedUrl)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "This source URL is already added.",
            path: [index, "url"]
          });
        }
        seenUrls.add(normalizedUrl);
      });
    }),
  notes: z.string().max(MAX_RECIPE_NOTES_LENGTH, `Keep notes under ${MAX_RECIPE_NOTES_LENGTH} characters.`),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Ingredient name is required.").max(MAX_INGREDIENT_NAME_LENGTH, `Keep ingredient names under ${MAX_INGREDIENT_NAME_LENGTH} characters.`),
        amount: optionalIngredientAmount,
        unit: optionalIngredientUnit,
        notes: z.string().max(MAX_INGREDIENT_NOTES_LENGTH, `Keep ingredient notes under ${MAX_INGREDIENT_NOTES_LENGTH} characters.`)
      })
    )
    .min(1, "Add at least one ingredient.")
    .max(MAX_INGREDIENTS, `Add ${MAX_INGREDIENTS} ingredients or fewer.`),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, "Step instruction is required.").max(MAX_STEP_INSTRUCTION_LENGTH, `Keep each step under ${MAX_STEP_INSTRUCTION_LENGTH} characters.`)
      })
    )
    .min(1, "Add at least one step.")
    .max(MAX_STEPS, `Add ${MAX_STEPS} steps or fewer.`)
});

export const DEFAULT_RECIPE_FORM_VALUES = {
  title: "",
  servings: 1,
  mealTypes: [],
  costRating: "",
  difficulty: "",
  imageUrl: "",
  sourceLinks: [],
  notes: "",
  ingredients: [{ name: "", amount: "", unit: "", notes: "" }],
  steps: [{ instruction: "" }]
} satisfies z.infer<typeof recipeFormSchema>;
