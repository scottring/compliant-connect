import { Database } from './supabase';
import type { Company } from './company';
import type { Tag } from './tag';

// Use generated Enums directly
export type QuestionType = Database['public']['Enums']['question_type'];
// Manually define PIRStatus based on direct DB query, as generation failed
// Actual DB Enum: ('draft', 'sent', 'in_progress', 'in_review', 'flagged', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled')
export type PIRStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'submitted'
  | 'in_review'
  | 'reviewed'
  | 'flagged'
  | 'approved'
  | 'rejected'
  | 'resubmitted'
  | 'canceled';
// export type PIRStatus = Database['public']['Enums']['pir_status']; // Original line, commented out
export type ResponseStatus = Database['public']['Enums']['response_status'];
export type FlagStatus = Database['public']['Enums']['flag_status'];
export type RelationshipStatus = Database['public']['Enums']['relationship_status'];

// Define valid status transitions
export const PIR_STATUS_TRANSITIONS: Record<PIRStatus, PIRStatus[]> = {
  'draft': ['sent', 'canceled'],             // Customer sends or cancels draft
  'sent': ['in_progress', 'rejected', 'canceled'], // Supplier starts, submits directly, or customer cancels
  'in_progress': ['submitted', 'rejected', 'canceled'],  // Supplier submits or cancels
  'submitted': ['in_review', 'rejected', 'canceled'], // Customer reviews, rejects, or cancels
  'in_review': ['reviewed', 'flagged', 'rejected', 'canceled'], // Customer reviews, rejects, or cancels
  'reviewed': ['approved', 'rejected', 'canceled'],                  // Can be rejected if flags are added during review
  'flagged': ['reviewed', 'rejected', 'canceled'], // Response has been flagged for review
  'approved': [], // Terminal state - no further transitions except via admin
  'rejected': ['resubmitted', 'canceled'],   // Supplier resubmits, or customer cancels
  'resubmitted': ['in_review', 'rejected', 'canceled'], // Resubmitted goes back for review
  'canceled': [],                            // Terminal
};

export const RESPONSE_STATUS_TRANSITIONS: Record<ResponseStatus, ResponseStatus[]> = {
  'draft': ['submitted'],
  'submitted': ['approved', 'flagged'],
  'flagged': ['submitted'],
  'approved': []
} as const;

// Status display names for UI
// Status display names for UI based on migration 20250410103533
// Status display names for UI based on the *actual* DB enum values + observed usage
// Adjusted display names based on actual enum
export const PIR_STATUS_DISPLAY: Record<PIRStatus, string> = {
  'draft': 'Draft',
  'sent': 'Sent', // Initial state after customer sends
  'in_progress': 'In Progress', // Supplier started working
  'submitted': 'Submitted', // Supplier submitted response, pending review
  'in_review': 'In Review',
  'reviewed': 'Reviewed', // Customer completed review
  'flagged': 'Flagged', // Response has been flagged for review
  'approved': 'Approved',
  'rejected': 'Rejected', // Customer rejected response
  'resubmitted': 'Resubmitted', // Supplier resubmitted after rejection
  'canceled': 'Canceled', // Request canceled
};

export const RESPONSE_STATUS_DISPLAY: Record<ResponseStatus, string> = {
  'draft': 'Draft',
  'submitted': 'Submitted',
  'flagged': 'Changes Requested',
  'approved': 'Approved'
} as const;

// Get all possible next statuses for a given status
export function getNextPossibleStatuses(currentStatus: PIRStatus): PIRStatus[] {
  return PIR_STATUS_TRANSITIONS[currentStatus];
}

// Check if a status is terminal (no further transitions possible)
export function isTerminalStatus(status: PIRStatus): boolean {
  return PIR_STATUS_TRANSITIONS[status].length === 0;
}

// Get a human-readable label for a status
export function getPIRStatusLabel(status: PIRStatus): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Type guard to check if a status transition is valid
export function isValidPIRStatusTransition(
  currentStatus: PIRStatus,
  newStatus: PIRStatus
): boolean {
  // Allow keeping the same status
  if (currentStatus === newStatus) {
    return true;
  }
  
  return PIR_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

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