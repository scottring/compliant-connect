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
      companies: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["user_role"]
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
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          created_at: string
          id: string
          question_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      questionnaire_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_id: string
          questionnaire_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_id: string
          questionnaire_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_id?: string
          questionnaire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_recipients: {
        Row: {
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          product_id: string | null
          questionnaire_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          product_id?: string | null
          questionnaire_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          product_id?: string | null
          questionnaire_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_recipients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_recipients_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_response_history: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          response_data: Json | null
          response_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          response_data?: Json | null
          response_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          response_data?: Json | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_response_history_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          created_by: string | null
          flagged: boolean
          id: string
          question_id: string
          recipient_id: string
          response_data: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          id?: string
          question_id: string
          recipient_id: string
          response_data?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          id?: string
          question_id?: string
          recipient_id?: string
          response_data?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          id: string
          optional: boolean
          order_index: number
          prompt: string
          question_type: Database["public"]["Enums"]["question_type"]
          section_id: string | null
          type_options: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          optional?: boolean
          order_index?: number
          prompt: string
          question_type: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          type_options?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          optional?: boolean
          order_index?: number
          prompt?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          type_options?: Json | null
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
        ]
      }
      response_history: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          response_data: Json | null
          response_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          response_data?: Json | null
          response_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          response_data?: Json | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_history_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          comment: string | null
          created_at: string
          flagged: boolean
          id: string
          question_id: string
          response_data: Json | null
          sheet_request_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          question_id: string
          response_data?: Json | null
          sheet_request_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          question_id?: string
          response_data?: Json | null
          sheet_request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_sheet_request_id_fkey"
            columns: ["sheet_request_id"]
            isOneToOne: false
            referencedRelation: "sheet_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          parent_section_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          parent_section_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          parent_section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_request_tags: {
        Row: {
          created_at: string
          id: string
          sheet_request_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sheet_request_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sheet_request_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_request_tags_sheet_request_id_fkey"
            columns: ["sheet_request_id"]
            isOneToOne: false
            referencedRelation: "sheet_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_request_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_requests: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          product_id: string | null
          requesting_company_id: string
          status: Database["public"]["Enums"]["request_status"]
          supplier_company_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          requesting_company_id: string
          status?: Database["public"]["Enums"]["request_status"]
          supplier_company_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          requesting_company_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          supplier_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_requests_requesting_company_id_fkey"
            columns: ["requesting_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_requests_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
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
      user_belongs_to_company: {
        Args: {
          company_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          permission_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      question_type: "text" | "number" | "boolean" | "multiple_choice" | "table"
      request_status: "pending" | "in_progress" | "completed" | "rejected"
      user_role: "admin" | "manager" | "user"
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
