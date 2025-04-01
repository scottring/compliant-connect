# Active Context

## Current Focus: PIR System and User Flow Implementation

### Timeline and Implementation Plan

#### 1. Question Bank System Enhancement (Current Focus)
- Continue improving question organization with sections/subsections
- Enhance question bank UI for better user experience
- Implement bulk import capabilities for questions
- Complete validation flows for question management

#### 2. PIR System Development (Next Priority)
- Complete PIR creation workflow
- Finalize response submission interface
- Implement review process dashboard
- Add status tracking and notification system

#### 3. Authentication and Access Control (Ongoing)
- Complete role-based access implementation
- Finalize company relationship validation
- Enhance error handling for edge cases
- Optimize company context switching

#### 4. Testing and Documentation (Parallel)
- End-to-end PIR flow testing
- Authentication system verification
- Schema validation and documentation
- Performance optimization

### Implementation Schedule

1. **Current Phase (April 1-5)**
   - Complete question bank enhancements
   - Begin PIR creation workflow
   - Continue role-based access implementation
   - Start end-to-end testing for question bank

2. **Phase 2 (April 6-10)**
   - Finalize PIR system functionality
   - Complete authentication enhancements
   - Implement review process dashboard
   - Continue testing and optimization

3. **Phase 3 (April 11-15)**
   - Implement notification system
   - Finalize role-based dashboards
   - Complete documentation
   - Final polish and optimization

### Critical Success Factors
1. Functional question bank with proper organization
2. Complete PIR workflow from creation to review
3. Reliable authentication and company context
4. Performant UI with proper loading states
5. Clear error handling throughout the system

### Current Status
- **Server State Management Refactored:** Integrated `@tanstack/react-query` in core hooks (`use-question-bank`, `use-tags`, `use-company-data`) and related components/pages (`Suppliers`, `AdminSettings`, `RequestSheetModal`, `SupplierProducts`, `CompanySelector`, `Navigation`). Manual fetching (`useEffect`/`useState`) replaced with `useQuery`, manual mutations replaced with `useMutation`.
- **AuthContext Simplified:** `AuthContext` now focuses solely on authentication state (`user`, `session`), company data management moved to `useCompanyData`.
- Question bank implementation significantly improved (section/subsection structure, RPC for question-tag association).
- Authentication system foundation stabilized.

### Next Immediate Steps
1.  **Complete React Query Rollout:** Apply `useQuery`/`useMutation` pattern to remaining components/hooks with manual data fetching/mutations.
2.  **Update Component Consumers:** Ensure components relying on old `AuthContext` company data or manual hook functions now use `useCompanyData` or the new query/mutation results correctly.
3.  **Refactor/Remove `AppContext` Server State:** Address the conflict between `AppContext`'s persisted state and React Query's server state management.
4.  Implement PIR creation workflow.
5.  Finalize role-based access control.
6.  Begin end-to-end testing.

### Risk Mitigation
1. Continue improving error handling
2. Enhance loading state management
3. Implement incremental data loading
4. Maintain detailed testing protocols
5. Document schema changes clearly

### Notes
- Recent work focused on question bank system
- Fixed persistent issues with question-tag associations
- Added better error handling throughout the application
- Improved data models for questions, sections, and subsections
- Enhanced loading state management in critical components

## Current Focus
Enhancing the question bank system and beginning PIR workflow implementation:
1. Complete question bank UI organization
2. Implement PIR creation interface
3. Enhance role-based access control
4. Optimize loading state management
5. Begin end-to-end testing

## Recent Changes
1.  **Server State Refactoring (React Query):**
    *   Integrated `@tanstack/react-query` (`useQuery`, `useMutation`).
    *   Refactored `use-question-bank`, `use-tags`, `use-company-data` hooks.
    *   Refactored `Suppliers`, `AdminSettings`, `RequestSheetModal`, `SupplierProducts` pages/components.
    *   Simplified `AuthContext`, created `useCompanyData`.
    *   Updated `CompanySelector`, `Navigation`, `ProtectedRoute`, `AuthDebug`.
2.  Major Question Bank Improvements (Previous):
    *   Implemented section/subsection structure.
    *   Fixed question-tag association with RPC.
    *   Added error handling.
    *   Improved schema consistency.

2. Authentication Enhancements:
   - Improved company context switching
   - Enhanced error handling
   - Better loading state management
   - More reliable user state tracking

3. PIR System Development:
   - Refactored supplier product page
   - Updated PIR request data model
   - Improved status tracking
   - Enhanced UI consistency

## Active Decisions
1.  **Server State Management:**
    *   Adopted `@tanstack/react-query` as the standard for fetching and mutating server state.
    *   Refactoring existing manual fetching (`useEffect`/`useState`) to use `useQuery`.
    *   Refactoring existing manual mutations to use `useMutation`.
    *   Utilizing query invalidation for data synchronization after mutations.
2.  **Context Separation:**
    *   `AuthContext` handles only authentication state.
    *   `useCompanyData` hook handles fetching user's companies and managing the current company selection.
3.  Question Bank Organization (Ongoing):
    *   Using section/subsection hierarchy.
    *   Implementing RPC for complex operations (e.g., `create_question_with_tags`).
4.  Authentication Strategy (Ongoing):
    *   Company context managed via `useCompanyData`.
    *   Role-based access control implemented in `Navigation` and `ProtectedRoute` based on `useCompanyData`.

## Next Steps
1.  **React Query Rollout & Cleanup**
    *   [ ] Refactor remaining manual data fetching/mutations.
    *   [ ] Update components using old context/hook patterns.
    *   [ ] Address `AppContext` server state duplication.
    *   [ ] Remove redundant loading/error states handled by React Query.
2.  Question Bank Completion
    *   [ ] Enhance question bank UI organization.
    *   [ ] Implement bulk import capabilities.
    *   [ ] Add advanced filtering and search.
3.  PIR System Implementation
    *   [ ] Complete PIR creation interface.
    *   [ ] Implement response submission forms.
    *   [ ] Develop review dashboard.
4.  Testing & Validation
    *   [ ] Test refactored hooks and components.
    *   [ ] Test authentication flows thoroughly.
    *   [ ] Test PIR workflow end-to-end.

## Known Issues
1. Core Functionality
   - Company state management has potential edge cases
   - Role-based access needs completion
   - PIR workflow requires further implementation
   - Notification system not yet implemented

2. Technical Debt
   - Utility functions contain hardcoded values
   - Some components need refactoring for consistency
   - Testing coverage needs improvement
   - Documentation requires updating

3. User Experience
   - Loading states could be more consistent
   - Error messages need further enhancement
   - Navigation flow needs optimization
   - Bulk operations need implementation

## Implementation Status

### Authentication & Company Context
- ✅ Basic authentication (`AuthContext`)
- ✅ Company data fetching (`useCompanyData` with `useQuery`)
- ✅ Default company selection logic (in `useCompanyData`)
- ✅ Company switching state management (in `useCompanyData`)
- ✅ Role-based access (basic implementation in `Navigation`, `ProtectedRoute` using `useCompanyData`)

### Server State Management (React Query)
- ✅ Setup (`QueryClientProvider`)
- ✅ `use-question-bank` hook refactored (`useQuery`, `useMutation`)
- ✅ `use-tags` hook refactored (`useQuery`, `useMutation`)
- ✅ `Suppliers` page refactored (`useQuery`, `useMutation`)
- ✅ `AdminSettings` page refactored (`useQuery`, `useMutation`)
- ✅ `RequestSheetModal` refactored (`useQuery`, `useMutation`)
- ✅ `SupplierProducts` page refactored (`useQuery`)
- 🔄 Apply pattern to remaining components/hooks

### Question Bank System
- ✅ Question CRUD operations (via `use-question-bank` mutations)
- ✅ Tag management (via `use-tags` mutations)
- ✅ Section/subsection structure (DB + `use-question-bank` queries/mutations)
- ✅ Question-tag association (via RPC in `use-question-bank` mutation)
- 🔄 UI organization
- ❌ Bulk import/export

### PIR System
- 🔄 PIR creation flow
- 🔄 Response submission
- ❌ Review process
- ❌ Status tracking
- ❌ Notification system

Legend:
✅ Complete
🔄 In Progress
❌ Not Started

## Directory Structure Status

### Current Structure Assessment
The project structure is evolving with feature-based organization:

#### Strengths
- Clear separation of core concerns (components, pages, context, etc.)
- Well-organized infrastructure (migrations, scripts, docs)
- Proper configuration file placement
- Memory bank structure follows best practices

#### Areas for Improvement
1. **Components Directory**
   - Implementing feature-based structure
   - Moving shared components to common directory
   - Separating layout components
   - Current Status: In progress, need to continue restructuring

2. **Pages Directory**
   - Moving toward feature-based organization
   - Implementing proper lazy loading
   - Current Status: Functional but needs further reorganization

3. **Utils Directory**
   - Need better categorization
   - API utilities should be separated
   - Current Status: Basic structure, needs enhancement

4. **Types Organization**
   - Implementing domain-based organization
   - Co-locating types with features where appropriate
   - Current Status: Improving with clearer type definitions

### Next Steps
1. Continue feature-based reorganization
2. Implement clear patterns for new components
3. Enhance import consistency
4. Improve documentation in key directories
5. Add README files to explain component purposes

### Migration Priority
1. High: Component reorganization
2. Medium: Page structure improvement
3. Medium: Utils categorization
4. Low: Types reorganization

## Immediate Development Structure Guidelines

### Forward-Compatible Development (Pre-Restructure)
To minimize restructuring effort while maintaining development velocity, follow these patterns for new code:

#### New Components
```
src/components/[feature]/
├── features/     # New feature-specific components
├── ui/          # New feature-specific UI components
└── utils/       # New feature-specific utilities
```

#### New Pages
```
src/pages/[feature]/
└── index.tsx    # Main feature page
```

#### New Types
```
src/types/
└── [feature]/   # Feature-specific types
```

### Current Development Rules
1. **New Features**
   - Create feature-specific directories upfront
   - Keep related code co-located
   - Use index.ts files for exports

2. **Shared Components**
   - If clearly reusable, place in `src/components/common/`
   - Document reuse potential in component comments

3. **Documentation**
   - Add README.md in new feature directories
   - Document component purposes and relationships
   - Mark temporary solutions with TODO comments

4. **Imports**
   - Use relative paths for feature-specific imports
   - Use absolute paths for shared utilities
   - Keep import statements organized and grouped

This approach allows continued development while making future restructuring easier. 