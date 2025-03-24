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
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  progress: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Question {
  id: string;
  text: string;
  tags: Tag[];
  type: "text" | "number" | "boolean" | "select" | "multi-select";
  options?: string[];
  required: boolean;
  sectionId?: string;
  subsectionId?: string;
}

export interface Section {
  id: string;
  name: string;
  description?: string;
}

export interface Subsection {
  id: string;
  name: string;
  description?: string;
  sectionId: string;
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
}

export interface Comment {
  id: string;
  answerId: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface SupplierResponse {
  questionId: string;
  value: string | number | boolean | string[];
}

export interface PIR {
  id: string;
  name: string;
  description: string;
  sections: Section[];
}
