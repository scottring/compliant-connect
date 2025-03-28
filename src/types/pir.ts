import { Database } from '@/integrations/supabase/types';

export type QuestionType = 'text' | 'number' | 'boolean' | 'single_choice' | 'multiple_choice' | 'file_upload';
export type PIRStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision_requested';

// Validation rules for different question types
export interface TextValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
}

export interface NumberValidationRules {
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export type ValidationRules = TextValidationRules | NumberValidationRules;

// Question category with optional parent
export interface QuestionCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// Question definition
export interface Question {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  type: QuestionType;
  is_required: boolean;
  options: string[] | null; // For single_choice and multiple_choice
  validation_rules: ValidationRules | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// PIR request
export interface PIRRequest {
  id: string;
  title: string;
  description: string | null;
  customer_company_id: string;
  supplier_company_id: string;
  status: PIRStatus;
  due_date: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

// Junction table for PIR questions
export interface PIRQuestion {
  id: string;
  pir_id: string;
  question_id: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Response data types based on question type
export type ResponseData = {
  text: string;
  number: number;
  boolean: boolean;
  single_choice: string;
  multiple_choice: string[];
  file_upload: string[]; // Array of file IDs
}

// PIR response
export interface PIRResponse {
  id: string;
  pir_id: string;
  question_id: string;
  response_data: ResponseData[keyof ResponseData];
  notes: string | null;
  created_by: string;
  reviewed_by: string | null;
  review_status: PIRStatus;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// File attachment
export interface PIRFile {
  id: string;
  pir_id: string;
  question_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Helper type for PIR with its questions and responses
export interface PIRWithDetails extends PIRRequest {
  questions: (PIRQuestion & {
    question: Question;
    response?: PIRResponse;
    files?: PIRFile[];
  })[];
}

// Database insert types
export type InsertQuestionCategory = Omit<QuestionCategory, 'id' | 'created_at' | 'updated_at'>;
export type InsertQuestion = Omit<Question, 'id' | 'created_at' | 'updated_at'>;
export type InsertPIRRequest = Omit<PIRRequest, 'id' | 'created_at' | 'updated_at'>;
export type InsertPIRQuestion = Omit<PIRQuestion, 'id' | 'created_at' | 'updated_at'>;
export type InsertPIRResponse = Omit<PIRResponse, 'id' | 'created_at' | 'updated_at'>;
export type InsertPIRFile = Omit<PIRFile, 'id' | 'created_at' | 'updated_at'>;

// Database update types
export type UpdateQuestionCategory = Partial<InsertQuestionCategory>;
export type UpdateQuestion = Partial<InsertQuestion>;
export type UpdatePIRRequest = Partial<InsertPIRRequest>;
export type UpdatePIRQuestion = Partial<InsertPIRQuestion>;
export type UpdatePIRResponse = Partial<InsertPIRResponse>;
export type UpdatePIRFile = Partial<InsertPIRFile>; 