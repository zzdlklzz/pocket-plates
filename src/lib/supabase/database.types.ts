// Replace this file by running `npm run supabase:types` after linking Supabase.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "flexible";
      cost_rating: "very_cheap" | "cheap" | "moderate" | "splurge";
      difficulty_level: "easy" | "medium" | "hard" | "beginner_friendly";
      recipe_visibility: "private" | "shared" | "public";
    };
  };
};
