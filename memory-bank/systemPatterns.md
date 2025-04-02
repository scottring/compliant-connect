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

## Authentication Patterns

### 1. Authentication Flows
```typescript
interface AuthFlow {
  // Standard Sign Up
  standardSignUp: {
    steps: [
      'collectUserInfo',
      'createSupabaseUser',
      'createProfile',
      'createInitialCompany',
      'setupCompanyRelationship'
    ];
    rollback: boolean; // Supports rollback on failure
  };

  // Standard Sign In
  standardSignIn: {
    steps: [
      'authenticateUser',
      'fetchUserProfile',
      'fetchCompanyRelationships',
      'determineActiveCompany'
    ];
    retry: boolean; // Supports retry on data fetch failure
  };

  // Invitation-Based Sign Up
  invitationSignUp: {
    steps: [
      'validateInvitation',
      'collectUserInfo',
      'createSupabaseUser',
      'createProfile',
      'createSupplierCompany',
      'setupCompanyRelationship',
      'linkWithCustomer'
    ];
    rollback: boolean;
  };
}
```

### 2. Company Role Management
```typescript
type CompanyRole = 'supplier' | 'customer' | 'both';

interface CompanyContext {
  currentRole: CompanyRole;
  availableRoles: CompanyRole[];
  canSwitchRole: boolean;
}

interface RoleAccess {
  supplier: {
    canViewRequests: true;
    canRespond: true;
    canInitiateRequest: false;
  };
  customer: {
    canViewRequests: true;
    canRespond: false;
    canInitiateRequest: true;
  };
  both: {
    canViewRequests: true;
    canRespond: true;
    canInitiateRequest: true;
  };
}
```

### 3. State Management
```typescript
interface AuthState {
  user: User | null;
  profile: Profile | null;
  companies: UserCompany[];
  currentCompany: Company | null;
  loading: {
    user: boolean;
    profile: boolean;
    companies: boolean;
  };
  error: {
    type: 'auth' | 'profile' | 'company' | null;
    message: string | null;
  };
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}
```

## Company Relationship Patterns

### 1. Company Structure
```typescript
interface Company {
  id: string;
  name: string;
  role: CompanyRole;
  // Core company data
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyRelationship {
  id: string;
  customerCompanyId: string;
  supplierCompanyId: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface UserCompany {
  userId: string;
  companyId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Access Control Patterns
```typescript
interface AccessControl {
  // Row Level Security Policies
  companies: {
    select: 'user_has_company_access';
    insert: 'user_can_create_company';
    update: 'user_is_company_admin';
    delete: 'user_is_company_owner';
  };

  companyRelationships: {
    select: 'user_in_related_company';
    insert: 'user_can_create_relationship';
    update: 'user_in_customer_company';
    delete: 'user_in_customer_company';
  };

  // Function-level access
  functions: {
    createCompany: 'authenticated';
    updateCompany: 'company_admin';
    deleteCompany: 'company_owner';
    createRelationship: 'customer_admin';
  };
}
```

### 3. Data Flow Patterns
```typescript
interface DataFlow {
  // Company Creation
  createCompany: {
    validation: ['validateCompanyData', 'checkUserPermissions'];
    creation: ['createCompanyRecord', 'setupUserRelationship'];
    postCreation: ['setupDefaultSettings', 'notifyStakeholders'];
  };

  // Relationship Management
  createRelationship: {
    validation: ['validateCompanies', 'checkPermissions'];
    creation: ['createRelationshipRecord', 'setupInitialState'];
    notification: ['notifySupplier', 'notifyCustomer'];
  };

  // Context Switching
  switchCompanyContext: {
    validation: ['validateUserAccess', 'checkCompanyStatus'];
    transition: ['updateActiveCompany', 'refreshPermissions'];
    sideEffects: ['updateUI', 'refreshData'];
  };
}
```

## Error Handling Patterns

### 1. Authentication Errors
```typescript
interface AuthError {
  type: 'auth' | 'profile' | 'company';
  code: string;
  message: string;
  context?: any;
  retry?: boolean;
  recovery?: {
    possible: boolean;
    steps?: string[];
  };
}

interface ErrorHandling {
  // Authentication
  auth: {
    invalidCredentials: 'RETRY';
    sessionExpired: 'REFRESH';
    networkError: 'RETRY';
  };

  // Profile
  profile: {
    notFound: 'CREATE';
    invalid: 'UPDATE';
    locked: 'CONTACT_SUPPORT';
  };

  // Company
  company: {
    notFound: 'SELECT_DIFFERENT';
    accessDenied: 'REQUEST_ACCESS';
    invalid: 'UPDATE';
  };
}
```

### 2. Recovery Patterns
```typescript
interface RecoveryPattern {
  // Session Recovery
  session: {
    expired: ['refreshToken', 'revalidateSession', 'restoreState'];
    invalid: ['clearSession', 'redirectToLogin'];
  };

  // Data Recovery
  data: {
    profileMissing: ['createProfile', 'retryOperation'];
    companyMissing: ['selectDefaultCompany', 'retryOperation'];
  };

  // State Recovery
  state: {
    inconsistent: ['refreshUserData', 'validateState', 'restoreConsistency'];
    corrupt: ['resetState', 'rehydrateFromServer'];
  };
}
```

## Testing Patterns

### 1. Authentication Testing
```typescript
interface AuthTest {
  // Flow Testing
  flows: {
    standardSignUp: ['happy_path', 'validation_errors', 'network_errors'];
    standardSignIn: ['success', 'invalid_credentials', 'locked_account'];
    invitationSignUp: ['valid_invitation', 'expired_invitation', 'network_errors'];
  };

  // State Testing
  state: {
    initialization: ['empty', 'partial', 'complete'];
    transitions: ['signIn', 'signOut', 'refresh', 'expire'];
    errors: ['handling', 'recovery', 'persistence'];
  };
}
```

### 2. Company Testing
```typescript
interface CompanyTest {
  // Relationship Testing
  relationships: {
    creation: ['customer_initiated', 'invalid_data', 'duplicate'];
    access: ['permitted', 'denied', 'role_based'];
    modification: ['status_update', 'role_change', 'deletion'];
  };

  // Context Testing
  context: {
    switching: ['valid_switch', 'invalid_switch', 'during_operation'];
    persistence: ['page_reload', 'tab_switch', 'browser_restart'];
  };
} 