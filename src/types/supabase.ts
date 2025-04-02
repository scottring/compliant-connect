export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_relationships: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          status: Database["public"]["Enums"]["relationship_status"]
          supplier_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["relationship_status"]
          supplier_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["relationship_status"]
          supplier_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
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
      pir_requests: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          product_id: string | null
          status: Database["public"]["Enums"]["pir_status"]
          suggested_product_name: string | null
          supplier_company_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["pir_status"]
          suggested_product_name?: string | null
          supplier_company_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["pir_status"]
          suggested_product_name?: string | null
          supplier_company_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pir_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pir_responses: {
        Row: {
          answer: Json
          created_at: string | null
          id: string
          pir_id: string | null
          question_id: string | null
          status: Database["public"]["Enums"]["response_status"]
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          answer: Json
          created_at?: string | null
          id?: string
          pir_id?: string | null
          question_id?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: Json
          created_at?: string | null
          id?: string
          pir_id?: string | null
          question_id?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pir_responses_pir_id_fkey"
            columns: ["pir_id"]
            isOneToOne: false
            referencedRelation: "pir_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_responses_pir_id_fkey"
            columns: ["pir_id"]
            isOneToOne: false
            referencedRelation: "pir_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pir_tags: {
        Row: {
          created_at: string | null
          id: string
          pir_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pir_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pir_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pir_tags_pir_id_fkey"
            columns: ["pir_id"]
            isOneToOne: false
            referencedRelation: "pir_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_tags_pir_id_fkey"
            columns: ["pir_id"]
            isOneToOne: false
            referencedRelation: "pir_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_answer_history: {
        Row: {
          answer: Json
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          product_answer_id: string | null
        }
        Insert: {
          answer: Json
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          product_answer_id?: string | null
        }
        Update: {
          answer?: Json
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          product_answer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_answer_history_product_answer_id_fkey"
            columns: ["product_answer_id"]
            isOneToOne: false
            referencedRelation: "product_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_answers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          current_answer: Json
          id: string
          product_id: string | null
          question_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_answer: Json
          id?: string
          product_id?: string | null
          question_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_answer?: Json
          id?: string
          product_id?: string | null
          question_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_answers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
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
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          created_at: string | null
          id: string
          question_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          tag_id?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          options: Json | null
          required: boolean | null
          subsection_id: string | null
          text: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          required?: boolean | null
          subsection_id?: string | null
          text: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          required?: boolean | null
          subsection_id?: string | null
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      response_comments: {
        Row: {
          comment: string
          created_at: string | null
          flag_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          flag_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          flag_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "response_comments_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "response_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      response_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          response_id: string | null
          status: Database["public"]["Enums"]["flag_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_id?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_id?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "response_flags_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "pir_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subsections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          section_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index: number
          section_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          section_id?: string | null
          updated_at?: string | null
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
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      company_relationships_view: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          status: Database["public"]["Enums"]["relationship_status"] | null
          supplier_id: string | null
          supplier_name: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pir_access_view: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          description: string | null
          due_date: string | null
          id: string | null
          product_id: string | null
          product_name: string | null
          status: Database["public"]["Enums"]["pir_status"] | null
          supplier_company_id: string | null
          supplier_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pir_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pir_requests_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_access_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_question_with_tags: {
        Args: {
          p_subsection_id: string
          p_text: string
          p_description: string
          p_type: Database["public"]["Enums"]["question_type"]
          p_required: boolean
          p_options: Json
          p_tag_ids: string[]
        }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          options: Json | null
          required: boolean | null
          subsection_id: string | null
          text: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string | null
        }
      }
    }
    Enums: {
      flag_status: "open" | "in_progress" | "resolved" | "rejected"
      pir_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "flagged"
        | "approved"
        | "rejected"
        | "pending_supplier"
        | "pending_review"
        | "accepted"
      question_type:
        | "text"
        | "number"
        | "boolean"
        | "single_select"
        | "multi_select"
        | "date"
        | "file"
      relationship_status: "pending" | "active" | "inactive" | "rejected"
      response_status: "draft" | "submitted" | "flagged" | "approved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      flag_status: ["open", "in_progress", "resolved", "rejected"],
      pir_status: [
        "draft",
        "submitted",
        "in_review",
        "flagged",
        "approved",
        "rejected",
        "pending_supplier",
        "pending_review",
        "accepted",
      ],
      question_type: [
        "text",
        "number",
        "boolean",
        "single_select",
        "multi_select",
        "date",
        "file",
      ],
      relationship_status: ["pending", "active", "inactive", "rejected"],
      response_status: ["draft", "submitted", "flagged", "approved"],
    },
  },
} as const

