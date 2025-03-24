
import { Company, ProductSheet, Question, Tag, User } from "../types";

// Empty mock users array with just a default admin user
export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=1",
    companyId: "c1",
  },
];

// Empty mock tags array
export const mockTags: Tag[] = [];

// Empty mock questions array
export const mockQuestions: Question[] = [];

// Empty mock companies array with just the admin's company
export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Your Company",
    role: "both",
    contactName: "Admin User",
    contactEmail: "admin@example.com",
    contactPhone: "+1 (555) 123-4567",
    progress: 0,
  },
];

// Empty mock product sheets array
export const mockProductSheets: ProductSheet[] = [];
