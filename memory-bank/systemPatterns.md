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

## Directory Structure Patterns

### Core Directory Organization
```
src/
├── components/          # UI Components
│   ├── common/         # Shared components
│   ├── features/       # Feature-specific components
│   ├── layout/         # Layout components
│   └── ui/             # Base UI components
├── pages/              # Page components
│   ├── auth/
│   ├── products/
│   ├── suppliers/
│   └── shared/
├── context/            # React contexts
├── hooks/              # Custom React hooks
├── types/              # TypeScript types
│   ├── api/
│   ├── models/
│   └── shared/
├── utils/              # Utility functions
│   ├── api/
│   ├── formatting/
│   ├── validation/
│   └── helpers/
├── config/            # Configuration
└── integrations/      # External service integrations
```

### Component Organization Guidelines
1. **Feature-First Organization**: Group related components by feature
2. **Shared Components**: Place reusable components in `common/`
3. **Layout Components**: Keep layout-specific components separate
4. **UI Components**: Base UI components in dedicated directory

### Page Organization Guidelines
1. **Feature-Based Structure**: Group related pages by feature
2. **Shared Pages**: Common pages (404, unauthorized) in shared directory
3. **Index Files**: Use index.ts for clean exports
4. **Lazy Loading**: Implement code splitting at the page level

### Type Organization Guidelines
1. **Co-location**: Keep types close to their implementation when specific
2. **Shared Types**: Common types in dedicated directories
3. **API Types**: Separate directory for API-related types
4. **Model Types**: Business model types in dedicated directory

### Utils Organization Guidelines
1. **Functional Groups**: Organize by functionality
2. **API Utils**: Keep API-related utilities separate
3. **Formatting**: Dedicated space for formatting functions
4. **Validation**: Separate validation logic

### Best Practices
1. **Consistent Naming**: Use consistent naming conventions across directories
2. **Index Files**: Utilize index files for clean exports
3. **Co-location**: Keep related files close together
4. **Separation of Concerns**: Clear boundaries between different types of code
5. **Documentation**: Maintain README files in key directories
6. **Testing**: Co-locate tests with implementation files

### Migration Guidelines
1. **Incremental Updates**: Move files gradually to new structure
2. **Documentation**: Update imports systematically
3. **Testing**: Ensure all tests pass after moves
4. **Review**: Peer review structural changes 