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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          created_at: string
          email: string | null
          id: string
          required_roles: string[]
          route: string
          user_agent: string | null
          user_id: string | null
          user_roles: string[]
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          required_roles?: string[]
          route: string
          user_agent?: string | null
          user_id?: string | null
          user_roles?: string[]
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          required_roles?: string[]
          route?: string
          user_agent?: string | null
          user_id?: string | null
          user_roles?: string[]
        }
        Relationships: []
      }
      action_item_updates: {
        Row: {
          action_item_id: string
          coach_id: string | null
          created_at: string
          id: string
          note: string
          update_text: string | null
          update_type: string
        }
        Insert: {
          action_item_id: string
          coach_id?: string | null
          created_at?: string
          id?: string
          note: string
          update_text?: string | null
          update_type?: string
        }
        Update: {
          action_item_id?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          note?: string
          update_text?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_item_updates_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_item_updates_item_fk"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          source_lci_id: string | null
          source_top_task_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          source_lci_id?: string | null
          source_top_task_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          source_lci_id?: string | null
          source_top_task_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_items_source_lci_fk"
            columns: ["source_lci_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_source_lci_id_fkey"
            columns: ["source_lci_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_source_top_task_fk"
            columns: ["source_top_task_id"]
            isOneToOne: false
            referencedRelation: "lci_top_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_source_top_task_id_fkey"
            columns: ["source_top_task_id"]
            isOneToOne: false
            referencedRelation: "lci_top_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_insights: {
        Row: {
          body: string
          coach_id: string
          created_at: string
          id: string
          insight_type: string
          severity: string
          title: string
        }
        Insert: {
          body: string
          coach_id: string
          created_at?: string
          id?: string
          insight_type?: string
          severity?: string
          title: string
        }
        Update: {
          body?: string
          coach_id?: string
          created_at?: string
          id?: string
          insight_type?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_insights_coach_fk"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_insights_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          access_code: string
          created_at: string
          email: string
          id: string
          name: string
          organization: string | null
          user_id: string | null
        }
        Insert: {
          access_code?: string
          created_at?: string
          email: string
          id?: string
          name: string
          organization?: string | null
          user_id?: string | null
        }
        Update: {
          access_code?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cohort_checkins: {
        Row: {
          created_at: string
          daily_rating: number
          date: string
          faith: number
          family: number
          field: number
          finance: number
          fitness: number
          friends: number
          fun: number
          id: string
          member_id: string
          step_count: number
        }
        Insert: {
          created_at?: string
          daily_rating?: number
          date: string
          faith?: number
          family?: number
          field?: number
          finance?: number
          fitness?: number
          friends?: number
          fun?: number
          id?: string
          member_id: string
          step_count?: number
        }
        Update: {
          created_at?: string
          daily_rating?: number
          date?: string
          faith?: number
          family?: number
          field?: number
          finance?: number
          fitness?: number
          friends?: number
          fun?: number
          id?: string
          member_id?: string
          step_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cohort_checkins_member_fk"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "cohort_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "cohort_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          alias: string
          coach_id: string
          created_at: string
          display_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          alias?: string
          coach_id: string
          created_at?: string
          display_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          alias?: string
          coach_id?: string
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_coach_fk"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      lci_highs_lows: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          session_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lci_highs_lows_session_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lci_highs_lows_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lci_sessions: {
        Row: {
          ai_briefing: string | null
          created_at: string
          help_needed: string | null
          id: string
          next_lci_date: string | null
          session_date: string
          user_id: string | null
          year_review: string | null
        }
        Insert: {
          ai_briefing?: string | null
          created_at?: string
          help_needed?: string | null
          id?: string
          next_lci_date?: string | null
          session_date?: string
          user_id?: string | null
          year_review?: string | null
        }
        Update: {
          ai_briefing?: string | null
          created_at?: string
          help_needed?: string | null
          id?: string
          next_lci_date?: string | null
          session_date?: string
          user_id?: string | null
          year_review?: string | null
        }
        Relationships: []
      }
      lci_top_tasks: {
        Row: {
          created_at: string
          feel: string | null
          help_needed: string | null
          id: string
          obstacles: string | null
          position: number
          session_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          feel?: string | null
          help_needed?: string | null
          id?: string
          obstacles?: string | null
          position?: number
          session_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          feel?: string | null
          help_needed?: string | null
          id?: string
          obstacles?: string | null
          position?: number
          session_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lci_top_tasks_session_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lci_top_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lci_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nudge_inbound_log: {
        Row: {
          captured_to: string | null
          id: string
          matched_intent: string | null
          matched_outbound_id: string | null
          message_body: string
          phone_number: string
          received_at: string
          user_id: string | null
        }
        Insert: {
          captured_to?: string | null
          id?: string
          matched_intent?: string | null
          matched_outbound_id?: string | null
          message_body: string
          phone_number: string
          received_at?: string
          user_id?: string | null
        }
        Update: {
          captured_to?: string | null
          id?: string
          matched_intent?: string | null
          matched_outbound_id?: string | null
          message_body?: string
          phone_number?: string
          received_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nudge_log: {
        Row: {
          id: string
          message: string
          nudge_type: string
          phone_number: string
          sent_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message: string
          nudge_type: string
          phone_number: string
          sent_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string
          nudge_type?: string
          phone_number?: string
          sent_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nudge_preferences: {
        Row: {
          created_at: string
          display_name: string | null
          gratitude_reminder: boolean
          habit_reminder: boolean
          id: string
          nudge_enabled: boolean
          phone_number: string
          preferred_hour: number
          step_reminder: boolean
          timezone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          gratitude_reminder?: boolean
          habit_reminder?: boolean
          id?: string
          nudge_enabled?: boolean
          phone_number: string
          preferred_hour?: number
          step_reminder?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          gratitude_reminder?: boolean
          habit_reminder?: boolean
          id?: string
          nudge_enabled?: boolean
          phone_number?: string
          preferred_hour?: number
          step_reminder?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_task_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          lci_top_task_id: string
          note_text: string
          partnership_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          lci_top_task_id: string
          note_text: string
          partnership_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          lci_top_task_id?: string
          note_text?: string
          partnership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_task_notes_lci_top_task_id_fkey"
            columns: ["lci_top_task_id"]
            isOneToOne: false
            referencedRelation: "lci_top_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_task_notes_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "user_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_complete: boolean
          phone_number: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_complete?: boolean
          phone_number?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          phone_number?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_lci: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone_number: string
          prep_sent: boolean
          scheduled_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number: string
          prep_sent?: boolean
          scheduled_at: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string
          prep_sent?: boolean
          scheduled_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          id: string
          overall_score: number | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          id?: string
          overall_score?: number | null
          user_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          id?: string
          overall_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_cycles: {
        Row: {
          created_at: string
          ended_on: string | null
          id: string
          started_on: string
          status: string
          target_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_on?: string | null
          id?: string
          started_on?: string
          status?: string
          target_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_on?: string | null
          id?: string
          started_on?: string
          status?: string
          target_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_journal_entries: {
        Row: {
          created_at: string
          cycle_day: number | null
          daily_rating: number
          entry_date: string
          evening_completed_at: string | null
          evening_reflection: string | null
          gratitude_1: string | null
          gratitude_2: string | null
          gratitude_3: string | null
          id: string
          step_count: number
          top_priority: string | null
          top_priority_done: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_day?: number | null
          daily_rating?: number
          entry_date?: string
          evening_completed_at?: string | null
          evening_reflection?: string | null
          gratitude_1?: string | null
          gratitude_2?: string | null
          gratitude_3?: string | null
          id?: string
          step_count?: number
          top_priority?: string | null
          top_priority_done?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_day?: number | null
          daily_rating?: number
          entry_date?: string
          evening_completed_at?: string | null
          evening_reflection?: string | null
          gratitude_1?: string | null
          gratitude_2?: string | null
          gratitude_3?: string | null
          id?: string
          step_count?: number
          top_priority?: string | null
          top_priority_done?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_journal_habits: {
        Row: {
          completed: boolean
          created_at: string
          habit_name: string
          id: string
          journal_entry_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_name: string
          id?: string
          journal_entry_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_name?: string
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journal_habits_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "user_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_life_vision: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          vision_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          vision_text?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          vision_text?: string
        }
        Relationships: []
      }
      user_partnerships: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_pillar_scores: {
        Row: {
          checkin_id: string
          created_at: string
          how_it_feels: string | null
          id: string
          pillar: string
          score: number
          whats_happening: string | null
        }
        Insert: {
          checkin_id: string
          created_at?: string
          how_it_feels?: string | null
          id?: string
          pillar: string
          score: number
          whats_happening?: string | null
        }
        Update: {
          checkin_id?: string
          created_at?: string
          how_it_feels?: string | null
          id?: string
          pillar?: string
          score?: number
          whats_happening?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pillar_scores_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_truth_statements: {
        Row: {
          created_at: string
          id: string
          levels: Json
          linked_top_task_id: string | null
          priority: string
          statement: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          levels?: Json
          linked_top_task_id?: string | null
          priority: string
          statement: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          levels?: Json
          linked_top_task_id?: string | null
          priority?: string
          statement?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_truth_statements_linked_top_task_id_fkey"
            columns: ["linked_top_task_id"]
            isOneToOne: false
            referencedRelation: "lci_top_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_weekly_resets: {
        Row: {
          business_high: string | null
          business_low: string | null
          created_at: string
          faith_score: number | null
          family_score: number | null
          field_score: number | null
          finance_score: number | null
          fitness_score: number | null
          friends_score: number | null
          fun_score: number | null
          id: string
          personal_high: string | null
          personal_low: string | null
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          business_high?: string | null
          business_low?: string | null
          created_at?: string
          faith_score?: number | null
          family_score?: number | null
          field_score?: number | null
          finance_score?: number | null
          fitness_score?: number | null
          friends_score?: number | null
          fun_score?: number | null
          id?: string
          personal_high?: string | null
          personal_low?: string | null
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          business_high?: string | null
          business_low?: string | null
          created_at?: string
          faith_score?: number | null
          family_score?: number | null
          field_score?: number | null
          finance_score?: number | null
          fitness_score?: number | null
          friends_score?: number | null
          fun_score?: number | null
          id?: string
          personal_high?: string | null
          personal_low?: string | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      user_year_priorities: {
        Row: {
          category: string
          created_at: string
          id: string
          position: number
          priority_text: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          position?: number
          priority_text: string
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          position?: number
          priority_text?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "member" | "coach" | "admin"
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
      app_role: ["member", "coach", "admin"],
    },
  },
} as const
