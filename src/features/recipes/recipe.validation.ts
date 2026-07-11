import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), "Use a full http or https URL.");

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "Add a recipe title."),
  servings: z.coerce.number().int().positive("Servings must be at least 1."),
  mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner", "snack", "flexible"])).min(1, "Choose at least one meal type."),
  costRating: z.union([z.enum(["very_cheap", "cheap", "moderate", "splurge"]), z.literal("")]),
  difficulty: z.union([z.enum(["easy", "medium", "hard", "beginner_friendly"]), z.literal("")]),
  imageUrl: optionalUrl,
  sourceUrl: optionalUrl,
  notes: z.string(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Ingredient name is required."),
        amount: z.string(),
        unit: z.string(),
        notes: z.string()
      })
    )
    .min(1, "Add at least one ingredient."),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, "Step instruction is required."),
        timerMinutes: z.string()
      })
    )
    .min(1, "Add at least one step.")
});

export const DEFAULT_RECIPE_FORM_VALUES = {
  title: "",
  servings: 1,
  mealTypes: [],
  costRating: "",
  difficulty: "",
  imageUrl: "",
  sourceUrl: "",
  notes: "",
  ingredients: [{ name: "", amount: "", unit: "", notes: "" }],
  steps: [{ instruction: "", timerMinutes: "" }]
} satisfies z.infer<typeof recipeFormSchema>;
