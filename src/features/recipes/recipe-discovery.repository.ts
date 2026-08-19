import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RecipeEffortLabel } from "./recipe.types";

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export async function replaceRecipeDiscoveryMetadata(
  supabase: SupabaseBrowserClient,
  recipeId: string,
  effortLabels: RecipeEffortLabel[]
) {
  const { error } = await supabase.rpc(
    "replace_recipe_discovery_metadata",
    // The @supabase/ssr browser client currently narrows generated RPC arguments to never.
    {
      p_recipe_id: recipeId,
      p_effort_labels: effortLabels
    } as never
  );

  if (error) {
    throw error;
  }
}
