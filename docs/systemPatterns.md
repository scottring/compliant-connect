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


## Product Information Request (PIR) Workflow

This outlines the sequence of actions and notifications involved when a customer requests product information from a supplier.

1.  **Initiation (Customer):**
    *   An authenticated user belonging to a customer company navigates to the PIR creation interface (e.g., via the supplier list or product sheet area).
    *   The customer selects the relevant information categories required by choosing corresponding **Tags** (e.g., REACH, US EPA). These tags are linked to specific questions in the central Question Bank.
    *   The customer selects the target **Supplier Company** and the specific **Product** (or suggests a new product name).
    *   The customer submits the request.
    *   **Database:** A new record is created in `pir_requests` linking the customer, supplier, product (or suggestion), and selected tags. Initial status is likely `'draft'` or `'new'`. Corresponding `pir_responses` records might be created with a default 'pending' status for each relevant question, or they might be created only when the supplier first saves/submits an answer.
    *   **Notification:** An **email** is sent to the supplier company's contact notifying them of the new request from "[Requesting Company Name]" for "[Product Name]", including a link to the `SupplierResponseForm` page for that specific PIR ID.

2.  **Response (Supplier):**
    *   The supplier user receives the email notification or sees the pending request in their dashboard/list (`OurProducts` page).
    *   They navigate to the `SupplierResponseForm` page using the link or manually.
    *   The form displays only the questions associated with the **Tags** selected by the customer in the initial PIR request.
    *   The supplier fills out the answers for the displayed questions.
    *   **Save as Draft:** Answers can be saved progressively (e.g., via `upsert` to `pir_responses` with status 'draft'). The form remains editable.
    *   **Submit Response:** When all required answers are filled, the supplier clicks "Submit Response".
    *   **Database:** The status of the main `pir_requests` record is updated to `'submitted'`. The individual `pir_responses` might also have their status updated if applicable. Answers become locked for supplier editing at this stage.
    *   **Notification:** An **email** is sent to the requesting customer company's contact notifying them that the response for "[Product Name]" from "[Supplier Company Name]" is ready for review, including a link to the `CustomerReview` page for that PIR ID.

3.  **Review (Customer):**
    *   The customer user receives the email notification or sees the submitted PIR in their dashboard/list.
    *   They navigate to the `CustomerReview` page using the link or manually.
    *   The page displays the questions and the supplier's submitted answers. Answers are **read-only** for the customer.
    *   For each answer, the customer has options:
        *   **Approve:** Mark the answer as satisfactory.
        *   **Flag:** Mark the answer as needing revision. A comment/note explaining the issue is required.
        *   **(Comment):** Add comments for discussion without necessarily flagging (handled via `CommentsThread`).
    *   **Database:** When the customer submits their review:
        *   Flags are created in the `response_flags` table for each flagged answer, linking back to the specific `pir_responses` record and including the note.
        *   The overall status of the `pir_requests` record is updated based on the review outcome:
            *   If *any* answer was flagged, the status becomes `'flagged'` (or similar, e.g., `'needs_revision'`).
            *   If *all* answers were approved, the status becomes `'approved'`. 
    *   **Notification:** An **email** is sent back to the supplier company's contact:
        *   If flagged: Notifying them that the response requires revision, including a link back to the `SupplierResponseForm`.
        *   If approved: Notifying them that the response has been approved.

4.  **Revision (Supplier - Iterative):**
    *   The supplier receives the email notification about required revisions or sees the updated status.
    *   They navigate back to the `SupplierResponseForm`.
    *   The form should now clearly indicate it's for "Round 2" (or N) of review.
    *   **Crucially:** The form should ideally **only display the questions corresponding to the *flagged* answers**, along with the customer's notes/flags. Approved answers should likely be hidden or read-only to focus the supplier's attention.
    *   The supplier reviews the flags/notes, potentially adds comments, and updates the necessary answers.
    *   The supplier clicks "Submit Response" again.
    *   **Database:** The relevant `pir_responses` are updated. The main `pir_requests` status is updated back to `'submitted'`. Flags might be marked as 'resolved' or handled appropriately.
    *   **Notification:** An **email** is sent back to the customer, indicating a revised response is ready for review (similar to step 2 notification).

5.  **Final Approval (Customer):**
    *   The review process (Step 3 & 4) repeats until the customer approves all answers in a review cycle.
    *   When all answers are approved, the `pir_requests` status is set to `'approved'`. 
    *   **Database:** The approved answers might be consolidated or linked to a final `ProductSheet` record for historical tracking and easy access.
    *   **Notification:** A final notification might be sent to the supplier confirming approval.

This iterative loop continues until full approval is achieved.

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