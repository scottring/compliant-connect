
import { Company, ProductSheet, Question, Tag, User } from "../types";

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Amanda Smith",
    email: "amanda@example.com",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "u2",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
];

export const mockTags: Tag[] = [
  {
    id: "tag1",
    name: "REACH",
    color: "#3b82f6",
    description: "EU Registration, Evaluation, Authorization and Restriction of Chemicals",
  },
  {
    id: "tag2",
    name: "US EPA",
    color: "#ef4444",
    description: "US Environmental Protection Agency requirements",
  },
  {
    id: "tag3",
    name: "RoHS",
    color: "#10b981",
    description: "Restriction of Hazardous Substances",
  },
  {
    id: "tag4",
    name: "TSCA",
    color: "#f59e0b",
    description: "Toxic Substances Control Act",
  },
  {
    id: "tag5",
    name: "CLP",
    color: "#8b5cf6",
    description: "Classification, Labelling and Packaging of substances",
  },
];

export const mockQuestions: Question[] = [
  {
    id: "q1",
    text: "Does your product contain substances of very high concern (SVHC) above 0.1% weight by weight?",
    tags: [mockTags[0]], // REACH
    type: "boolean",
    required: true,
  },
  {
    id: "q2",
    text: "Please provide the Chemical Abstract Service (CAS) number for all chemical substances in your product.",
    tags: [mockTags[1], mockTags[3]], // US EPA, TSCA
    type: "text",
    required: true,
  },
  {
    id: "q3",
    text: "Does your product contain any of the following restricted substances?",
    tags: [mockTags[2]], // RoHS
    type: "multi-select",
    options: ["Lead", "Mercury", "Cadmium", "Hexavalent chromium", "PBB", "PBDE"],
    required: true,
  },
  {
    id: "q4",
    text: "What is the flash point of your chemical product?",
    tags: [mockTags[4]], // CLP
    type: "number",
    required: true,
  },
  {
    id: "q5",
    text: "Please select the hazard classification of your product according to GHS.",
    tags: [mockTags[0], mockTags[4]], // REACH, CLP
    type: "select",
    options: ["Flammable", "Toxic", "Corrosive", "Environmentally hazardous", "Not classified as hazardous"],
    required: true,
  },
  {
    id: "q6",
    text: "Has your product been registered under REACH?",
    tags: [mockTags[0]], // REACH
    type: "boolean",
    required: true,
  },
  {
    id: "q7",
    text: "Please provide the REACH registration number if applicable.",
    tags: [mockTags[0]], // REACH
    type: "text",
    required: false,
  },
  {
    id: "q8",
    text: "Is your product exempt from TSCA reporting requirements?",
    tags: [mockTags[3]], // TSCA
    type: "boolean",
    required: true,
  },
];

export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "Tech Suppliers Company",
    role: "supplier",
    contactName: "Sarah Johnson",
    contactEmail: "sarah@techsuppliers.com",
    contactPhone: "+1 (555) 123-4567",
    progress: 75,
  },
  {
    id: "c2",
    name: "ABC Supplies",
    role: "supplier",
    contactName: "Mike Wilson",
    contactEmail: "mike@abcsupplies.com",
    contactPhone: "+1 (555) 234-5678",
    progress: 60,
  },
  {
    id: "c3",
    name: "Supplier 3",
    role: "supplier",
    contactName: "Amy Rogers",
    contactEmail: "amy@supplier3.com",
    contactPhone: "+1 (555) 345-6789",
    progress: 80,
  },
  {
    id: "c4",
    name: "Supplier 4",
    role: "both",
    contactName: "John Smith",
    contactEmail: "john@supplier4.com",
    contactPhone: "+1 (555) 456-7890",
    progress: 45,
  },
  {
    id: "c5",
    name: "Supplier 5",
    role: "supplier",
    contactName: "Emma Davis",
    contactEmail: "emma@supplier5.com",
    contactPhone: "+1 (555) 567-8901",
    progress: 90,
  },
  {
    id: "c6",
    name: "Supplier 6",
    role: "supplier",
    contactName: "David Wilson",
    contactEmail: "david@supplier6.com",
    contactPhone: "+1 (555) 678-9012",
    progress: 30,
  },
  {
    id: "c7",
    name: "Supplier 7",
    role: "both",
    contactName: "Lisa Brown",
    contactEmail: "lisa@supplier7.com",
    contactPhone: "+1 (555) 789-0123",
    progress: 55,
  },
  {
    id: "c8",
    name: "ChemCorp Industries",
    role: "customer",
    contactName: "Robert Miller",
    contactEmail: "robert@chemcorp.com",
    contactPhone: "+1 (555) 890-1234",
    progress: 0,
  },
  {
    id: "c9",
    name: "Global Chemicals Ltd",
    role: "both",
    contactName: "Jennifer Adams",
    contactEmail: "jennifer@globalchem.com",
    contactPhone: "+1 (555) 901-2345",
    progress: 0,
  },
];

export const mockProductSheets: ProductSheet[] = [
  {
    id: "ps1",
    name: "Chemical Compound X-42",
    description: "Industrial solvent used in cleaning applications",
    supplierId: "c1",
    requestedById: "c8",
    status: "submitted",
    questions: [mockQuestions[0], mockQuestions[1], mockQuestions[4]],
    answers: [],
    createdAt: new Date("2023-10-15"),
    updatedAt: new Date("2023-10-20"),
    tags: ["tag1", "tag5"], // Using tag IDs instead of Tag objects
  },
  {
    id: "ps2",
    name: "Electronic Component E-100",
    description: "Circuit board component for industrial applications",
    supplierId: "c2",
    requestedById: "c9",
    status: "reviewing",
    questions: [mockQuestions[2]],
    answers: [],
    createdAt: new Date("2023-09-05"),
    updatedAt: new Date("2023-09-25"),
    tags: ["tag3"], // Using tag IDs instead of Tag objects
  },
  {
    id: "ps3",
    name: "Chemical Mixture CM-50",
    description: "Chemical mixture used in manufacturing processes",
    supplierId: "c3",
    requestedById: "c8",
    status: "approved",
    questions: [mockQuestions[0], mockQuestions[1], mockQuestions[3], mockQuestions[4]],
    answers: [],
    createdAt: new Date("2023-08-12"),
    updatedAt: new Date("2023-08-30"),
    tags: ["tag1", "tag2", "tag5"], // Using tag IDs instead of Tag objects
  },
  {
    id: "ps4",
    name: "Plastic Component PC-200",
    description: "Plastic component for consumer products",
    supplierId: "c4",
    requestedById: "c9",
    status: "draft",
    questions: [mockQuestions[2]],
    answers: [],
    createdAt: new Date("2023-11-01"),
    updatedAt: new Date("2023-11-01"),
    tags: ["tag3"], // Using tag IDs instead of Tag objects
  },
];
