export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'content_admin' | 'editor'
export type OrgRole = 'member' | 'representative' | 'vice_representative'
export type EmployeePosition = '사원' | '주임' | '대리' | '과장' | '차장' | '부장' | '이사' | '대표' | '부대표'

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      company_intro_config: {
        Row: {
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          display_order: number
          division_id: string | null
          hired_at: string
          id: string
          is_dispatched: boolean
          is_resigned: boolean
          name: string
          org_role: string
          position: string | null
          profile_image_url: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          division_id?: string | null
          hired_at: string
          id?: string
          is_dispatched?: boolean
          is_resigned?: boolean
          name: string
          org_role?: string
          position?: string | null
          profile_image_url?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          division_id?: string | null
          hired_at?: string
          id?: string
          is_dispatched?: boolean
          is_resigned?: boolean
          name?: string
          org_role?: string
          position?: string | null
          profile_image_url?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employees_division_id_fkey'
            columns: ['division_id']
            isOneToOne: false
            referencedRelation: 'divisions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      image_contents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          image_url: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'image_contents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      news_contents: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          news_date: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          news_date?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          news_date?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'news_contents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: UserRole
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name?: string
          role?: UserRole
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          division_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          division_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          division_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_division_id_fkey'
            columns: ['division_id']
            isOneToOne: false
            referencedRelation: 'divisions'
            referencedColumns: ['id']
          },
        ]
      }
      video_contents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'video_contents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      visitor_contents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          location: string
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          title: string
          updated_at: string
          visitor_name: string
          visitor_org: string
          visitor_title: string
          display_order: number
          visit_date: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          location: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          title: string
          updated_at?: string
          visitor_name: string
          visitor_org: string
          visitor_title: string
          display_order?: number
          visit_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location?: string
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          title?: string
          updated_at?: string
          visitor_name?: string
          visitor_org?: string
          visitor_title?: string
          display_order?: number
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'visitor_contents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

// ── 편의 타입 alias — Row ────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Division = Database['public']['Tables']['divisions']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type NewsContent = Database['public']['Tables']['news_contents']['Row']
export type VisitorContent = Database['public']['Tables']['visitor_contents']['Row']
export type CompanyIntroConfig = Database['public']['Tables']['company_intro_config']['Row']
export type VideoContent = Database['public']['Tables']['video_contents']['Row']
export type ImageContent = Database['public']['Tables']['image_contents']['Row']

// ── 편의 타입 alias — Insert ────────────────────────────────────────────────

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type DivisionInsert = Database['public']['Tables']['divisions']['Insert']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type NewsContentInsert = Database['public']['Tables']['news_contents']['Insert']
export type VisitorContentInsert = Database['public']['Tables']['visitor_contents']['Insert']
export type CompanyIntroConfigInsert = Database['public']['Tables']['company_intro_config']['Insert']
export type VideoContentInsert = Database['public']['Tables']['video_contents']['Insert']
export type ImageContentInsert = Database['public']['Tables']['image_contents']['Insert']

// ── 편의 타입 alias — Update ────────────────────────────────────────────────

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type DivisionUpdate = Database['public']['Tables']['divisions']['Update']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update']
export type NewsContentUpdate = Database['public']['Tables']['news_contents']['Update']
export type VisitorContentUpdate = Database['public']['Tables']['visitor_contents']['Update']
export type CompanyIntroConfigUpdate = Database['public']['Tables']['company_intro_config']['Update']
export type VideoContentUpdate = Database['public']['Tables']['video_contents']['Update']
export type ImageContentUpdate = Database['public']['Tables']['image_contents']['Update']
