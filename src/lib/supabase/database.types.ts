export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      equipment: {
        Row: {
          created_at: string
          id: string
          label: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list_items: {
        Row: {
          amount: number | null
          checked: boolean
          created_at: string
          grocery_list_id: string
          id: string
          name: string
          sort_order: number
          source_recipe_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          checked?: boolean
          created_at?: string
          grocery_list_id: string
          id?: string
          name: string
          sort_order?: number
          source_recipe_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          checked?: boolean
          created_at?: string
          grocery_list_id?: string
          id?: string
          name?: string
          sort_order?: number
          source_recipe_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_grocery_list_id_fkey"
            columns: ["grocery_list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_items_source_recipe_id_fkey"
            columns: ["source_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          planned_for: string
          recipe_id: string
          servings: number
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          planned_for: string
          recipe_id: string
          servings?: number
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          planned_for?: string
          recipe_id?: string
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          title: string | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          title?: string | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          title?: string | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          created_at: string
          default_unit: string | null
          estimated_unit_cost: number | null
          id: string
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["pantry_item_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_unit?: string | null
          estimated_unit_cost?: number | null
          id?: string
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["pantry_item_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_unit?: string | null
          estimated_unit_cost?: number | null
          id?: string
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["pantry_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recipe_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_equipment_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          amount: number | null
          created_at: string
          group_name: string | null
          id: string
          name: string
          notes: string | null
          recipe_id: string
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          group_name?: string | null
          id?: string
          name: string
          notes?: string | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          group_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_links: {
        Row: {
          created_at: string
          id: string
          label: string
          recipe_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          recipe_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          recipe_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_meal_types: {
        Row: {
          created_at: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
        }
        Insert: {
          created_at?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
        }
        Update: {
          created_at?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_meal_types_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          id: string
          instruction: string
          recipe_id: string
          sort_order: number
          timer_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instruction: string
          recipe_id: string
          sort_order?: number
          timer_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instruction?: string
          recipe_id?: string
          sort_order?: number
          timer_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          created_at: string
          recipe_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          archived_at: string | null
          cook_minutes: number | null
          cost_rating: Database["public"]["Enums"]["cost_rating"] | null
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          estimated_total_cost: number | null
          id: string
          image_storage_path: string | null
          image_url: string | null
          is_favorite: boolean
          notes: string | null
          owner_id: string
          prep_minutes: number | null
          published_at: string | null
          servings: number
          slug: string | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["recipe_visibility"]
        }
        Insert: {
          archived_at?: string | null
          cook_minutes?: number | null
          cost_rating?: Database["public"]["Enums"]["cost_rating"] | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          estimated_total_cost?: number | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          is_favorite?: boolean
          notes?: string | null
          owner_id: string
          prep_minutes?: number | null
          published_at?: string | null
          servings?: number
          slug?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Update: {
          archived_at?: string | null
          cook_minutes?: number | null
          cost_rating?: Database["public"]["Enums"]["cost_rating"] | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          estimated_total_cost?: number | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          is_favorite?: boolean
          notes?: string | null
          owner_id?: string
          prep_minutes?: number | null
          published_at?: string | null
          servings?: number
          slug?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          label: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          label: string
          owner_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cost_rating: "very_cheap" | "cheap" | "moderate" | "splurge"
      difficulty_level: "easy" | "medium" | "hard" | "beginner_friendly"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "flexible"
      pantry_item_status: "active" | "archived"
      recipe_visibility: "private" | "shared" | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cost_rating: ["very_cheap", "cheap", "moderate", "splurge"],
      difficulty_level: ["easy", "medium", "hard", "beginner_friendly"],
      meal_type: ["breakfast", "lunch", "dinner", "snack", "flexible"],
      pantry_item_status: ["active", "archived"],
      recipe_visibility: ["private", "shared", "public"],
    },
  },
} as const
