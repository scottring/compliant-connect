import { Database, Json } from "./supabase"; // Import Database and Json types

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
  companyId?: string; // Add company ID to associate users with companies
}

export interface Company {
  id: string;
  name: string;
  role: "supplier" | "customer" | "both";
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  progress: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Question {
  id: string;
  text: string;
  description: string | null;
  type: Database['public']['Enums']['question_type']; // Use generated enum
  required: boolean;
  options: any | null;
  tags: Tag[];
  created_at: string;
  updated_at: string | null; // Match generated type
  subsection_id: string | null; // Match generated type
}

export interface Section {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  name: string;
  description?: string;
  order?: number; // Keep for potential legacy use?
  order_index?: number | null; // Add the actual DB column name
}

export interface Subsection {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  name: string;
  description?: string;
  sectionId: string;
  order?: number; // Keep for potential legacy use?
  order_index?: number | null; // Add the actual DB column name
}

export interface ProductSheet {
  id: string;
  name: string;
  description?: string;
  supplierId: string;
  requestedById: string | null; // This might map to customer_id or created_by in pir_requests
  status: Database['public']['Enums']['pir_status']; // Use generated enum
  questions: Question[];
  answers?: Answer[]; // Make optional as it's likely fetched separately
  createdAt: Date;
  updatedAt: Date | string; // Allow string from DB fetch
  tags: string[]; // Using tag IDs instead of Tag objects
}

export interface Answer {
  id: string;
  questionId: string;
  value: Json | null; // Align with pir_responses.answer type (Json)
  comments: Comment[];
  flags?: Flag[]; // Keep if used, but ensure Flag type matches response_flags
}

export interface Comment {
  id: string;
  answerId: string;
  text: string;
  createdBy: string;
  createdByName?: string; // Make optional if not always available
  createdAt: Date;
}

// Align Flag type with response_flags table from supabase.ts
export interface Flag {
  id: string;
  response_id: string | null; // Matches DB
  comment?: string; // description column in DB? Make optional/check mapping
  created_by: string | null; // Matches DB
  createdByName?: string; // Not in DB, potentially fetched separately
  created_at: string | null; // Matches DB
  status?: Database['public']['Enums']['flag_status']; // Matches DB
  resolved_at?: string | null; // Matches DB
  resolved_by?: string | null; // Matches DB
  updated_at?: string | null; // Matches DB
}

export interface SupplierResponse {
  id: string;
  questionId: string | null; // Match pir_responses
  value: Json | null; // Match pir_responses.answer
  comments?: Comment[];
  flags?: Flag[];
}

export interface PIR {
  id: string;
  name?: string; // Not in pir_requests
  description?: string; // Use description from pir_requests
  sections?: Section[]; // Not directly on pir_requests
  // Add fields from PIRRequest type in pir.ts if this type is still needed
}

// Import Json type helper from supabase types

export type ColumnType = "text" | "number" | "boolean" | "select" | "multi-select";

export interface NestedTableColumns {
  name: string;
  type: ColumnType;
  options?: string[];
}

export interface TableColumn {
  name: string;
  type: ColumnType;
  options?: string[];
  nested?: boolean;
  nestedColumns?: NestedTableColumns[];
}


export interface PirRequest {
  id: string;
  customer_id: string | null;
  supplier_company_id: string | null; // Corrected field name
  status: Database['public']['Enums']['pir_status']; // Use generated enum
  request_details: string | null;
  created_at: string; // Assuming string from DB fetch
  updated_at: string | null;
  // Add other relevant fields from pir_requests table if needed
  // e.g., product_id, requested_by_user_id, etc.
}

export type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};
