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
      organisations: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          employee_count: number | null
          id: string
          industry: string | null
          name: string
          size: number | null
          status: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name: string
          size?: number | null
          status?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name?: string
          size?: number | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          manager_id: string | null
          org_id: string | null
          phone: string | null
          position: string | null
          role: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id: string
          job_title?: string | null
          manager_id?: string | null
          org_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          manager_id?: string | null
          org_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          live_end: string | null
          live_start: string | null
          open_link_enabled: boolean
          open_link_token: string
          org_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          live_end?: string | null
          live_start?: string | null
          open_link_enabled?: boolean
          open_link_token?: string
          org_id: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          live_end?: string | null
          live_start?: string | null
          open_link_enabled?: boolean
          open_link_token?: string
          org_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string | null
          dimension: string | null
          hint: string | null
          id: string
          options: Json | null
          order_num: number
          question_type: string
          survey_id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dimension?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          order_num?: number
          question_type?: string
          survey_id: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dimension?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          order_num?: number
          question_type?: string
          survey_id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_respondents: {
        Row: {
          department: string | null
          draft_answers: Json | null
          draft_saved_at: string | null
          email: string
          id: string
          invited_at: string | null
          job_grade: string | null
          job_title: string | null
          name: string | null
          reminded_at: string | null
          response_timing: string | null
          source: string
          started_at: string | null
          submitted_at: string | null
          survey_id: string
          tenure: string | null
          token: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          department?: string | null
          draft_answers?: Json | null
          draft_saved_at?: string | null
          email: string
          id?: string
          invited_at?: string | null
          job_grade?: string | null
          job_title?: string | null
          name?: string | null
          reminded_at?: string | null
          response_timing?: string | null
          source?: string
          started_at?: string | null
          submitted_at?: string | null
          survey_id: string
          tenure?: string | null
          token?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          department?: string | null
          draft_answers?: Json | null
          draft_saved_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          job_grade?: string | null
          job_title?: string | null
          name?: string | null
          reminded_at?: string | null
          response_timing?: string | null
          source?: string
          started_at?: string | null
          submitted_at?: string | null
          survey_id?: string
          tenure?: string | null
          token?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_respondents_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          id: string
          respondent_id: string
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          respondent_id: string
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          answers?: Json
          id?: string
          respondent_id?: string
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: true
            referencedRelation: "survey_respondents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "survey"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_my_org: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      register_open_respondent: {
        Args: {
          p_department: string
          p_job_grade: string
          p_job_title: string
          p_name?: string
          p_open_token: string
          p_tenure: string
        }
        Returns: {
          respondent_token: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
