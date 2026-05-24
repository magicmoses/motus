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
      enrichments: {
        Row: {
          body_regions: string[] | null
          confidence_evidence: number | null
          confidence_regions: number | null
          confidence_sports: number | null
          confidence_topics: number | null
          created_at: string | null
          enrichment_status: string | null
          evidence_level: number | null
          id: string
          paper_id: string
          population: string | null
          practical_relevance: boolean | null
          sample_size: number | null
          sports: string[] | null
          study_type: string | null
          summary: string | null
          tags: string[] | null
          topics: string[] | null
        }
        Insert: {
          body_regions?: string[] | null
          confidence_evidence?: number | null
          confidence_regions?: number | null
          confidence_sports?: number | null
          confidence_topics?: number | null
          created_at?: string | null
          enrichment_status?: string | null
          evidence_level?: number | null
          id?: string
          paper_id: string
          population?: string | null
          practical_relevance?: boolean | null
          sample_size?: number | null
          sports?: string[] | null
          study_type?: string | null
          summary?: string | null
          tags?: string[] | null
          topics?: string[] | null
        }
        Update: {
          body_regions?: string[] | null
          confidence_evidence?: number | null
          confidence_regions?: number | null
          confidence_sports?: number | null
          confidence_topics?: number | null
          created_at?: string | null
          enrichment_status?: string | null
          evidence_level?: number | null
          id?: string
          paper_id?: string
          population?: string | null
          practical_relevance?: boolean | null
          sample_size?: number | null
          sports?: string[] | null
          study_type?: string | null
          summary?: string | null
          tags?: string[] | null
          topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          raw: Json
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          raw: Json
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          raw?: Json
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      papers: {
        Row: {
          abstract: string | null
          authors: string[] | null
          created_at: string | null
          doi: string | null
          id: string
          journal: string | null
          published_at: string | null
          source_id: string | null
          source_name: string | null
          source_url: string | null
          title: string
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          created_at?: string | null
          doi?: string | null
          id?: string
          journal?: string | null
          published_at?: string | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          title: string
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          created_at?: string | null
          doi?: string | null
          id?: string
          journal?: string | null
          published_at?: string | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          id: string
          list_name: string | null
          paper_id: string | null
          saved_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          list_name?: string | null
          paper_id?: string | null
          saved_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          list_name?: string | null
          paper_id?: string | null
          saved_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saves_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          id: string
          interests: string[] | null
          onboarded_at: string | null
          preferred_distances: string[] | null
          primary_sport: string | null
          sport_subcategory: string | null
        }
        Insert: {
          email?: string | null
          id: string
          interests?: string[] | null
          onboarded_at?: string | null
          preferred_distances?: string[] | null
          primary_sport?: string | null
          sport_subcategory?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          interests?: string[] | null
          onboarded_at?: string | null
          preferred_distances?: string[] | null
          primary_sport?: string | null
          sport_subcategory?: string | null
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

// Convenience aliases — use these in components instead of Tables<'papers'>['Row']
export type Paper = Tables<'papers'>
export type PaperInsert = TablesInsert<'papers'>
export type Enrichment = Tables<'enrichments'>
export type EnrichmentInsert = TablesInsert<'enrichments'>
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type Save = Tables<'saves'>
export type IngestionQueueItem = Tables<'ingestion_queue'>

// Domain types
export type EnrichmentStatus =
  | 'pending' | 'processing' | 'auto_committed'
  | 'needs_review' | 'rejected' | 'flagged' | 'failed'

export type SportName =
  | 'running' | 'cycling' | 'rowing' | 'skiing' | 'hyrox' | 'inline_skating'

export type StudyType =
  | 'RCT' | 'cohort' | 'review' | 'case_study'
  | 'mechanistic' | 'meta_analysis' | 'cross_sectional'

export type Population = 'recreational' | 'trained' | 'elite' | 'mixed' | 'unknown'

// Joined type used in feed components
export type PaperWithEnrichment = Paper & { enrichments: Enrichment[] }
