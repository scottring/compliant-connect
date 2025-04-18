
import { Company, ProductSheet, Question, Tag, User } from "../types";

// Define mock users
export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Supplier User",
    email: "supplier@example.com",
    role: "user",
    companyId: "c1",
  },
];

// Define mock tags
export const mockTags: Tag[] = [
  {
    id: "tag1",
    name: "Environmental",
    color: "green",
    description: "Environmental sustainability information",
  },
  {
    id: "tag2",
    name: "Safety",
    color: "red",
    description: "Product safety information",
  },
  {
    id: "tag3",
    name: "Compliance",
    color: "blue",
    description: "Regulatory compliance information",
  },
];

// Define mock companies
export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Tech Suppliers Company",
    contactName: "John Supplier",
    contactEmail: "supplier@example.com",
    contactPhone: "555-123-4567",
    role: "supplier",
    progress: 75,
    address: "123 Supplier St",
    city: "Suppliertown",
    state: "ST",
    zipCode: "12345",
    country: "USA",
  },
  {
    id: "c2",
    name: "ABC Supplies",
    contactName: "Jane Supplier",
    contactEmail: "jane@abcsupplies.com",
    contactPhone: "555-987-6543",
    role: "supplier",
    progress: 85,
    address: "456 Component Ave",
    city: "Partsville",
    state: "PS",
    zipCode: "54321",
    country: "USA",
  },
  {
    id: "c3",
    name: "Supplier 3",
    contactName: "Sam Smith",
    contactEmail: "sam@supplier3.com",
    contactPhone: "555-456-7890",
    role: "supplier",
    progress: 90,
    address: "789 Chemical Rd",
    city: "Mixtown",
    state: "MT",
    zipCode: "67890",
    country: "USA",
  },
  {
    id: "c4",
    name: "Supplier 4",
    contactName: "Lisa Jones",
    contactEmail: "lisa@supplier4.com",
    contactPhone: "555-321-6547",
    role: "supplier",
    progress: 60,
    address: "321 Component St",
    city: "Plasticville",
    state: "PV",
    zipCode: "43210",
    country: "USA",
  },
  {
    id: "c6",
    name: "Supplier 6",
    contactName: "Sample Contact",
    contactEmail: "contact@supplier6.com",
    contactPhone: "555-111-2222",
    role: "supplier",
    progress: 40,
    address: "111 Sample St",
    city: "Sampleville",
    state: "SV",
    zipCode: "11111",
    country: "USA",
  },
  {
    id: "c7",
    name: "Supplier 7",
    contactName: "Test Contact",
    contactEmail: "contact@supplier7.com",
    contactPhone: "555-222-3333",
    role: "supplier",
    progress: 65,
    address: "222 Test Ave",
    city: "Testtown",
    state: "TT",
    zipCode: "22222",
    country: "USA",
  },
  {
    id: "c8",
    name: "Customer Inc",
    contactName: "Chris Customer",
    contactEmail: "chris@customer.com",
    contactPhone: "555-333-4444",
    role: "customer",
    progress: 0,
    address: "333 Customer Rd",
    city: "Customertown",
    state: "CT",
    zipCode: "33333",
    country: "USA",
  },
];

// Define mock questions
export const mockQuestions: Question[] = [
  {
    id: "q1",
    text: "What is the chemical composition of this product?",
    tags: [mockTags[0], mockTags[1]],
    type: "text",
    required: true,
  },
  {
    id: "q2",
    text: "Does this product contain any hazardous materials?",
    tags: [mockTags[1], mockTags[2]],
    type: "boolean",
    required: true,
  },
];

// Define mock product sheets
export const mockProductSheets: ProductSheet[] = [
  {
    id: "ps1",
    name: "Chemical Compound X-42",
    supplierId: "c1",
    requestedById: "c8",
    status: "submitted",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2023-10-01"),
    updatedAt: new Date("2023-10-19"),
    tags: ["tag1", "tag2"],
  },
  {
    id: "ps2",
    name: "Electronic Component E-100",
    supplierId: "c2",
    requestedById: "c8",
    status: "reviewing",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2023-09-15"),
    updatedAt: new Date("2023-09-24"),
    tags: ["tag2", "tag3"],
  },
  {
    id: "ps3",
    name: "Chemical Mixture CM-50",
    supplierId: "c3",
    requestedById: "c8",
    status: "approved",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2023-08-10"),
    updatedAt: new Date("2023-08-29"),
    tags: ["tag1", "tag3"],
  },
  {
    id: "ps4",
    name: "Plastic Component PC-200",
    supplierId: "c4",
    requestedById: "c8",
    status: "submitted",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2023-10-15"),
    updatedAt: new Date("2023-10-31"),
    tags: ["tag2"],
  },
  {
    id: "ps5",
    name: "Product Test",
    supplierId: "c1",
    requestedById: "c8",
    status: "approved",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag1", "tag2"],
  },
  {
    id: "ps6",
    name: "RequestTest",
    supplierId: "c3",
    requestedById: "c8",
    status: "reviewing",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag1", "tag3"],
  },
  {
    id: "ps7",
    name: "TestPro",
    supplierId: "c4",
    requestedById: "c8",
    status: "submitted",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag2"],
  },
  {
    id: "ps8",
    name: "Buick",
    supplierId: "c7",
    requestedById: "c8",
    status: "reviewing",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag2", "tag3"],
  },
  {
    id: "ps9",
    name: "Chemical Product 1",
    supplierId: "c3",
    requestedById: "c8",
    status: "approved",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag1", "tag2"],
  },
  {
    id: "ps10",
    name: "Sample6",
    supplierId: "c6",
    requestedById: "c8",
    status: "submitted",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag3"],
  },
  {
    id: "ps11",
    name: "ProductNano",
    supplierId: "c1",
    requestedById: "c8",
    status: "reviewing",
    questions: [mockQuestions[0], mockQuestions[1]],
    answers: [],
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-24"),
    tags: ["tag1", "tag2", "tag3"],
  },
];
