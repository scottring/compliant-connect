import { Database } from '@/types/supabase'; // Use generated types as source of truth

// Use generated Enums directly
export type QuestionType = Database['public']['Enums']['question_type'];
export type PIRStatus = Database['public']['Enums']['pir_status'];
export type ResponseStatus = Database['public']['Enums']['response_status'];
export type FlagStatus = Database['public']['Enums']['flag_status'];
export type RelationshipStatus = Database['public']['Enums']['relationship_status'];

// Define local types based on generated Row types, adding relationships if needed

// Corresponds to public.questions table
export type Question = Database['public']['Tables']['questions']['Row'] & {
    // Add any frontend-specific properties if necessary, e.g., fetched tags
    tags?: Tag[]; // Assuming Tag is defined in @/types/index.ts
};

// Corresponds to public.pir_requests table
export type PIRRequest = Database['public']['Tables']['pir_requests']['Row'];

// Corresponds to public.pir_responses table
export type PIRResponse = Database['public']['Tables']['pir_responses']['Row'] & {
    // Add related data fetched separately, like flags
    response_flags?: FlagType[]; // Use response_flags based on schema
};

// Corresponds to public.response_flags table
export type FlagType = Database['public']['Tables']['response_flags']['Row'];

// Corresponds to public.pir_tags table (useful for joins)
export type PIRTag = Database['public']['Tables']['pir_tags']['Row'];

// Corresponds to public.pir_questions table (useful for joins, if it exists)
// Check if pir_questions exists in your supabase.ts, otherwise remove this
// export type PIRQuestion = Database['public']['Tables']['pir_questions']['Row'];

// Helper type for PIR with details (adjust based on actual query structure)
export interface PIRWithDetails extends PIRRequest {
  questions: Question[]; // Array of Question objects
  responses?: PIRResponse[]; // Array of PIRResponse objects
  tags?: Tag[]; // Array of Tag objects
  // Add product, supplier, customer if joined
  product?: Database['public']['Tables']['products']['Row'] | null;
  supplier?: Database['public']['Tables']['companies']['Row'] | null;
  customer?: Database['public']['Tables']['companies']['Row'] | null;
}

// Type for displaying PIR summaries
export interface PIRSummary {
  id: string;
  productName: string;
  supplierId: string | null; // supplier_company_id is nullable
  supplierName?: string;
  customerId: string | null; // customer_id is nullable
  updatedAt: string | null;
  status: PIRStatus;
  tags?: { id: string; name: string }[];
  responseCount?: number;
  totalQuestions?: number; // Needs calculation
  customerName?: string;
}

// Use generated Insert/Update types directly where possible, or define specific input types
export type InsertPIRRequest = Database['public']['Tables']['pir_requests']['Insert'];
export type UpdatePIRRequest = Database['public']['Tables']['pir_requests']['Update'];
export type InsertPIRResponse = Database['public']['Tables']['pir_responses']['Insert'];
export type UpdatePIRResponse = Database['public']['Tables']['pir_responses']['Update'];
export type InsertFlag = Database['public']['Tables']['response_flags']['Insert'];
export type UpdateFlag = Database['public']['Tables']['response_flags']['Update'];
// Add others as needed (e.g., InsertPIRTag)

// Re-export Tag from main types if needed here, or import it where used
import { Tag } from '@/types/index';