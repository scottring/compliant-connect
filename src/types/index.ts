import { Database, Json } from "./supabase"; // Import Database and Json types

// Define Row types from generated Supabase types
export type DBPIRResponse = Database['public']['Tables']['pir_responses']['Row'];
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
  created_at?: string | null; // Ensure optional and nullable to match potential DB values
  updated_at?: string | null; // Ensure optional and nullable
}

export interface QuestionBase {
  id: string;
  text: string;
  description: string | null;
  required: boolean;
  tags: Tag[];
  created_at: string;
  updated_at: string | null;
  subsection_id: string | null;
  hierarchical_number?: string;
}

// Specific question types extending the base
export interface QuestionWithOptions extends QuestionBase {
  type: "select" | "multi-select";
  options: string[]; // Options are strings for select/multi-select
}

export interface QuestionListTable extends QuestionBase {
  type: "list_table";
  options: TableColumn[]; // Options define the table structure
}

export interface QuestionSimple extends QuestionBase {
  type: Exclude<Database['public']['Enums']['question_type'], "select" | "multi-select" | "list_table">;
  options: null; // No options for other types
}

// Union type for all question variations
export type Question = QuestionWithOptions | QuestionListTable | QuestionSimple;

export interface Section {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  name: string;
  description?: string | null; // Align with DB
  order?: number | null; // Align with DB order_index
  parent_id?: string | null; // Add parent_id for hierarchy
  created_at?: Date | null; // Add timestamps if needed
  updated_at?: Date | null; // Add timestamps if needed
  // Remove order_index if 'order' is used consistently
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
  answer?: Database["public"]["Tables"]["pir_response_components"]["Row"][] | null; // Added to support component_material_list
  comments?: Comment[];
  flags?: Flag[];
  status?: Database['public']['Enums']['flag_status']; // Status for reviewed responses
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

export interface TableColumn { // Ensure this is exported
  name: string;
  type: ColumnType;
  options?: string[];
  nested?: boolean;
  nestedColumns?: NestedTableColumns[];
}


export interface PirRequest {
  id: string;
  customer_id: string | null;
  supplier_company_id: string | null;
  product_id?: string | null; // Added product_id
  status: Database['public']['Enums']['pir_status'];
  request_details: string | null;
  created_at: string;
  updated_at: string | null;
  title?: string | null; // Added title
  description?: string | null; // Added description
  due_date?: string | null; // Added due_date
  suggested_product_name?: string | null; // Added suggested_product_name

  // Fields added during processing/joining
  customer?: Company | null;
  product?: { id?: string; name: string; } | null; // Allow partial product from join
  tags?: Tag[]; // Added for consistency, might be populated later
  responses?: DBPIRResponse[]; // Added for consistency
  customerName?: string; // Processed field
  productName?: string; // Processed field
  responseCount?: number; // Processed field
}

export type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type QuestionType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multi-select"
  | "list_table"
  | "single_select"
  | "multi_select"
  | "date"
  | "file"
  | "LIST_TABLE"
  | "component_material_list";
