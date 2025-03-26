export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          role: "supplier" | "customer" | "both"
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          progress: number
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          zip_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: "supplier" | "customer" | "both"
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          progress?: number
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: "supplier" | "customer" | "both"
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          progress?: number
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_relationships: {
        Row: {
          id: string
          customer_id: string
          supplier_id: string
          status: "active" | "inactive" | "pending"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          supplier_id: string
          status?: "active" | "inactive" | "pending"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          supplier_id?: string
          status?: "active" | "inactive" | "pending"
          created_at?: string
          updated_at?: string
        }
      }
      // ... other tables ...
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
  }
} 