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
  // color: string; // Removed - Not in DB schema
  description?: string;
}

export interface Question {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  text: string;
  description?: string; // Add description field
  tags: Tag[];
  type: "text" | "number" | "boolean" | "select" | "multi-select" | "table" | "file";
  options?: string[];
  required: boolean;
  sectionId?: string;
  subsectionId?: string;
  order?: number;
  tableColumns?: TableColumn[];
}

export interface Section {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  name: string;
  description?: string;
  order: number;
}

export interface Subsection {
  id: string;
  dbId?: string; // Database ID for integration with Supabase
  name: string;
  description?: string;
  sectionId: string;
  order: number;
}

export interface ProductSheet {
  id: string;
  name: string;
  description?: string;
  supplierId: string;
  requestedById: string | null;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
  questions: Question[];
  answers: Answer[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[]; // Using tag IDs instead of Tag objects
}

export interface Answer {
  id: string;
  questionId: string;
  value: string | number | boolean | string[];
  comments: Comment[];
  flags?: Flag[];
}

export interface Comment {
  id: string;
  answerId: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface Flag {
  id: string;
  answerId: string;
  comment: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface SupplierResponse {
  id: string;
  questionId: string;
  value: string | number | boolean | string[];
  comments?: Comment[];
  flags?: Flag[];
}

export interface PIR {
  id: string;
  name: string;
  description: string;
  sections: Section[];
}

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

export type CompanyUser = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};
