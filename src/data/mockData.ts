
import { Company, ProductSheet, Question, Tag, User } from "../types";

// Initial mock users with different roles
export const mockUsers: User[] = [
  {
    id: "user-admin-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    companyId: null,
  },
  {
    id: "user-customer-1",
    name: "Customer User",
    email: "customer@example.com",
    role: "user",
    companyId: "c1", // Will be linked to a customer company
  },
  {
    id: "user-supplier-1",
    name: "Supplier User",
    email: "supplier@example.com", 
    role: "user",
    companyId: "c2", // Will be linked to a supplier company
  }
];

// Empty mock tags array
export const mockTags: Tag[] = [];

// Empty mock questions array
export const mockQuestions: Question[] = [];

// Initial mock companies corresponding to the users above
export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Demo Customer Inc.",
    role: "customer",
    contactName: "Customer Contact",
    contactEmail: "contact@customer.com",
    contactPhone: "555-123-4567",
    progress: 0,
    address: "123 Customer St",
    city: "Customer City",
    state: "CS",
    zipCode: "12345",
    country: "USA",
  },
  {
    id: "c2",
    name: "Demo Supplier Ltd.",
    role: "supplier",
    contactName: "Supplier Contact",
    contactEmail: "contact@supplier.com",
    contactPhone: "555-987-6543",
    progress: 0,
    address: "456 Supplier Ave",
    city: "Supplier City",
    state: "SP",
    zipCode: "67890",
    country: "USA",
  }
];

// Initial mock product sheets
export const mockProductSheets: ProductSheet[] = [
  {
    id: "ps1",
    name: "Demo Product 1",
    description: "A demo product from the supplier",
    supplierId: "c2", // Linked to the supplier company
    requestedById: "c1", // Requested by the customer company
    status: "draft",
    questions: [],
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
  }
];
