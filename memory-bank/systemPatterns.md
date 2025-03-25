# System Patterns

## Architecture Overview

### Frontend
- Next.js application
- React components with TypeScript
- Tailwind CSS for styling
- ShadcnUI component library

### Backend
- Supabase for backend services
- PostgreSQL database
- Row Level Security for data access control
- Real-time subscriptions for updates

## Key Technical Decisions

### 1. Multi-tenant Data Model
```typescript
// Core entities and relationships
interface Company {
  id: string;
  name: string;
  role: 'supplier' | 'customer' | 'both';
}

interface CompanyRelationship {
  id: string;
  customerCompanyId: string;
  supplierCompanyId: string;
}

interface Product {
  id: string;
  name: string;
  companyId: string;  // Owner company
}

interface ProductSheet {
  id: string;
  productId: string;
  // Contains complete history
}

interface PIR {
  id: string;
  productSheetId: string;
  requestingCompanyId: string;
  supplierCompanyId: string;
  status: PIRStatus;
}
```

### 2. Question Management
- Questions stored in question bank
- Tags link questions to compliance categories
- Support for complex question types
- Section/subsection organization

### 3. Answer Management
- Answers linked to specific questions and products
- Historical tracking of all responses
- Smart reuse across multiple tags
- Comment threads per question

### 4. Status Workflow
```typescript
type PIRStatus = 
  | 'new'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'needs_revision'
  | 'approved';
```

### 5. Access Control
- Row Level Security based on company relationships
- Role-based UI access
- Secure data isolation between tenants

## Design Patterns

### 1. Component Architecture
- Atomic design principles
- Reusable UI components
- Consistent styling patterns

### 2. State Management
- React Context for global state
- Local state for component-specific data
- Optimistic updates for better UX

### 3. Form Management
- Controlled components
- Progressive form saving
- Validation patterns

### 4. Data Fetching
- Server-side rendering where appropriate
- Optimistic updates
- Real-time subscriptions for collaborative features

### 5. Error Handling
- Consistent error boundaries
- User-friendly error messages
- Graceful degradation

## Security Patterns
1. Authentication flow
2. Role-based access control
3. Data isolation
4. API security
5. Input validation 