
import { Company, ProductSheet, Question, Tag, User } from "../types";

// Add test users with different roles
export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=1",
    companyId: "c1",
  },
  {
    id: "u2",
    name: "Supplier Admin",
    email: "supplier@example.com",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=2",
    companyId: "c2",
  },
  {
    id: "u3",
    name: "Customer Admin",
    email: "customer@example.com",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=3",
    companyId: "c3",
  },
];

// Empty mock tags array
export const mockTags: Tag[] = [];

// Empty mock questions array
export const mockQuestions: Question[] = [];

// Mock companies array with admin, supplier, and customer companies
export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Admin Company",
    role: "both",
    contactName: "Admin User",
    contactEmail: "admin@example.com",
    contactPhone: "+1 (555) 123-4567",
    progress: 0,
  },
  {
    id: "c2",
    name: "Supplier Company",
    role: "supplier",
    contactName: "Supplier Admin",
    contactEmail: "supplier@example.com",
    contactPhone: "+1 (555) 234-5678",
    progress: 0,
  },
  {
    id: "c3",
    name: "Customer Company",
    role: "customer",
    contactName: "Customer Admin",
    contactEmail: "customer@example.com",
    contactPhone: "+1 (555) 345-6789",
    progress: 0,
  },
];

// Empty mock product sheets array
export const mockProductSheets: ProductSheet[] = [];
