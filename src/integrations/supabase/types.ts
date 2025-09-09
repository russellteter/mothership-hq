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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          business_id: string
          created_at: string
          id: string
          metadata_json: Json | null
          type: string
          uri: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          type: string
          uri: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          type?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_tags: {
        Row: {
          business_id: string
          tag_id: string
        }
        Insert: {
          business_id: string
          tag_id: string
        }
        Update: {
          business_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address_json: Json | null
          created_at: string
          franchise_bool: boolean | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          updated_at: string
          vertical: string | null
          website: string | null
        }
        Insert: {
          address_json?: Json | null
          created_at?: string
          franchise_bool?: boolean | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          updated_at?: string
          vertical?: string | null
          website?: string | null
        }
        Update: {
          address_json?: Json | null
          created_at?: string
          franchise_bool?: boolean | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          vertical?: string | null
          website?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          payload_json: Json | null
          processed_flags: Json | null
          type: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          payload_json?: Json | null
          processed_flags?: Json | null
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          payload_json?: Json | null
          processed_flags?: Json | null
          type?: string
        }
        Relationships: []
      }
      lead_views: {
        Row: {
          business_id: string
          created_at: string
          id: string
          rank: number | null
          score: number | null
          search_job_id: string
          subscores_json: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          rank?: number | null
          score?: number | null
          search_job_id: string
          subscores_json?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          rank?: number | null
          score?: number | null
          search_job_id?: string
          subscores_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_views_search_job_id_fkey"
            columns: ["search_job_id"]
            isOneToOne: false
            referencedRelation: "search_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          business_id: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          business_id: string
          confidence: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          source_url: string | null
        }
        Insert: {
          business_id: string
          confidence?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          source_url?: string | null
        }
        Update: {
          business_id?: string
          confidence?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_jobs: {
        Row: {
          created_at: string
          dsl_json: Json
          error_text: string | null
          id: string
          status: string
          summary_stats: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dsl_json: Json
          error_text?: string | null
          id?: string
          status?: string
          summary_stats?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dsl_json?: Json
          error_text?: string | null
          id?: string
          status?: string
          summary_stats?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          business_id: string
          confidence: number | null
          detected_at: string
          evidence_snippet: string | null
          evidence_url: string | null
          id: string
          overridden_by_user: boolean | null
          source_key: string
          type: string
          value_json: Json
        }
        Insert: {
          business_id: string
          confidence?: number | null
          detected_at?: string
          evidence_snippet?: string | null
          evidence_url?: string | null
          id?: string
          overridden_by_user?: boolean | null
          source_key: string
          type: string
          value_json: Json
        }
        Update: {
          business_id?: string
          confidence?: number | null
          detected_at?: string
          evidence_snippet?: string | null
          evidence_url?: string | null
          id?: string
          overridden_by_user?: boolean | null
          source_key?: string
          type?: string
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "signals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      status_logs: {
        Row: {
          business_id: string
          changed_at: string
          id: string
          status: string
        }
        Insert: {
          business_id: string
          changed_at?: string
          id?: string
          status: string
        }
        Update: {
          business_id?: string
          changed_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id?: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
