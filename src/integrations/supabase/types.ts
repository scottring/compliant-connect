export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string
          id: string
          product_sheet_id: string
          question_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          product_sheet_id: string
          question_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          product_sheet_id?: string
          question_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "answers_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          answer_id: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          text: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          text: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          country: string | null
          created_at: string
          id: string
          name: string
          progress: number
          role: string
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          country?: string | null
          created_at?: string
          id?: string
          name: string
          progress?: number
          role: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          progress?: number
          role?: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          answer_id: string
          comment: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
        }
        Insert: {
          answer_id: string
          comment: string
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
        }
        Update: {
          answer_id?: string
          comment?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sheet_tags: {
        Row: {
          product_sheet_id: string
          tag_id: string
        }
        Insert: {
          product_sheet_id: string
          tag_id: string
        }
        Update: {
          product_sheet_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sheet_tags_product_sheet_id_fkey"
            columns: ["product_sheet_id"]
            isOneToOne: false
            referencedRelation: "product_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sheet_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sheets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          requested_by_id: string | null
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          requested_by_id?: string | null
          status: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          requested_by_id?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sheets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          order_index: number | null
          required: boolean
          section_id: string | null
          subsection_id: string | null
          table_columns: Json | null
          text: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          required?: boolean
          section_id?: string | null
          subsection_id?: string | null
          table_columns?: Json | null
          text: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          required?: boolean
          section_id?: string | null
          subsection_id?: string | null
          table_columns?: Json | null
          text?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      subsections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_tables: {
        Args: Record<string, never>
        Returns: { table_name: string }[]
      }
      truncate_table: {
        Args: { table_name: string }
        Returns: void
      }
      disable_rls_temporarily: {
        Args: Record<string, never>
        Returns: void
      }
      enable_rls: {
        Args: Record<string, never>
        Returns: void
      }
      user_belongs_to_company: {
        Args: { company_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { permission: string }
        Returns: boolean
      }
      user_is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      question_type:
        | "text"
        | "number"
        | "boolean"
        | "multiple_choice"
        | "date"
        | "file"
        | "table"
      request_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "in_review"
      user_role: "admin" | "user" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
