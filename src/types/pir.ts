import { Database } from './supabase';
import type { Company } from './company';
import type { Tag } from './tag';

// Use generated Enums directly
export type QuestionType = Database['public']['Enums']['question_type'];
export type PIRStatus = Database['public']['Enums']['pir_status'];
export type ResponseStatus = Database['public']['Enums']['response_status'];
export type FlagStatus = Database['public']['Enums']['flag_status'];
export type RelationshipStatus = Database['public']['Enums']['relationship_status'];

// Valid status transitions
export const PIR_STATUS_TRANSITIONS: Record<PIRStatus, PIRStatus[]> = {
  'draft': ['sent'],
  'sent': ['in_progress'],
  'in_progress': ['submitted'],
  'submitted': ['reviewed', 'rejected'],
  'reviewed': [], // Terminal status
  'rejected': ['resubmitted', 'canceled'],
  'resubmitted': ['submitted'],
  'canceled': [] // Terminal status
} as const;

export const RESPONSE_STATUS_TRANSITIONS: Record<ResponseStatus, ResponseStatus[]> = {
  'draft': ['submitted'],
  'submitted': ['approved', 'flagged'],
  'flagged': ['submitted'],
  'approved': []
} as const;

// Status display names for UI
export const PIR_STATUS_DISPLAY: Record<PIRStatus, string> = {
  'draft': 'Draft',
  'sent': 'Sent',
  'in_progress': 'In Progress',
  'submitted': 'Submitted',
  'reviewed': 'Reviewed / Approved', // Changed from approved, updated display text
  'rejected': 'Reviewed - Feedback Required',
  'resubmitted': 'Resubmitted',
  'canceled': 'Canceled'
} as const;

export const RESPONSE_STATUS_DISPLAY: Record<ResponseStatus, string> = {
  'draft': 'Draft',
  'submitted': 'Submitted',
  'flagged': 'Changes Requested',
  'approved': 'Approved'
} as const;

// Type guard functions
export const isValidPIRStatusTransition = (from: PIRStatus, to: PIRStatus): boolean => {
  return PIR_STATUS_TRANSITIONS[from].includes(to);
};

export const isValidResponseStatusTransition = (from: ResponseStatus, to: ResponseStatus): boolean => {
  return RESPONSE_STATUS_TRANSITIONS[from].includes(to);
};

// Define local types based on generated Row types, adding relationships if needed

// Corresponds to public.questions table
export type Question = Database['public']['Tables']['questions']['Row'] & {
    // Add any frontend-specific properties if necessary, e.g., fetched tags
    tags?: Tag[]; // Assuming Tag is defined in @/types/index.ts
};

// Corresponds to public.pir_requests table
export type PIRRequest = Database['public']['Tables']['pir_requests']['Row'];

// Corresponds to public.pir_responses table
export type PIRResponse = Database['public']['Tables']['pir_responses']['Row'];

// Corresponds to public.response_flags table
export type ResponseFlag = Database['public']['Tables']['response_flags']['Row'];

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
export type InsertResponseFlag = Database['public']['Tables']['response_flags']['Insert'];
export type UpdateResponseFlag = Database['public']['Tables']['response_flags']['Update'];

// Base PIR types
export interface PIRBase {
  id: string;
  title: string | null;
  description: string | null;
  status: PIRStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  customer_id: string | null;
  supplier_company_id: string | null;
  product_id: string | null;
  suggested_product_name: string | null;
}

// Extended PIR type with related data
export interface PIRWithRelations extends PIRRequest {
  customer?: Company | null;
  supplier?: Company | null;
  product?: { id: string; name: string; } | null;
  tags?: Tag[];
  responses?: (PIRResponse & { response_flags?: ResponseFlag[] })[];
}

// Review types
export interface ReviewStatus {
  responseId: string;
  status: 'approved' | 'flagged';
  note?: string;
}

export interface ReviewSubmission {
  pirId: string;
  reviewStatuses: Record<string, 'approved' | 'flagged'>;
  reviewNotes: Record<string, string>;
  userId: string;
  userName: string;
  productId?: string;
}