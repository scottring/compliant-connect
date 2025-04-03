# Project Progress

## MVP Development Status

### Completed Features
- Initial UI components setup
- Basic database schema
- Supabase integration
- Local development setup (Docker, Supabase CLI)
- Streamlined MCP configuration (using global settings)
- Basic "Add Supplier" functionality (name only initially, then with contacts)
- Basic "Create Tag" functionality
- Basic "Create Question" functionality
- Section/subsection structure implementation
- RPC implementation for question-tag association
- Enhanced question bank schema
- Company context management with default company logic (initial version)
- **React Query Integration (Core):**
    - Setup `QueryClientProvider`.
    - Refactored `use-question-bank`, `use-tags`, `use-company-data` hooks.
    - Refactored `Suppliers`, `AdminSettings`, `RequestSheetModal`, `SupplierProducts` pages/components.
    - Simplified `AuthContext`, created `useCompanyData`.
    - Updated `CompanySelector`, `Navigation`, `ProtectedRoute`, `AuthDebug`.
- **PIR Creation & Display (Core Workflow):**
    - Fixed modal rendering crash (`React.Children.only` workaround).
    - Implemented product suggestion workflow (using `suggested_product_name` column) to handle RLS.
    - Fixed RLS policies for `pir_requests` (SELECT) and `pir_tags` (INSERT/SELECT) to support workflow.
    - Fixed data insertion logic (`supplier_company_id` in `useCreatePIRMutation`).
    - Fixed data fetching/display logic on `SupplierDetail` and `SupplierProducts` pages for suggested products.
    - Fixed data display on `SupplierCard` (snake_case vs camelCase).
- **UI Cleanup (on `feature/user-invites-v2`):**
    - Removed "Add New Supplier" button from Suppliers page.
    - Removed "Reset All Data" button from Suppliers page.
    - Created `AdminSettings` page and moved "Reset All Data" button there.
    - Added route for `AdminSettings` page.
- **Build Fix (on `feature/user-invites-v2`):**
    - Resolved Vite import error for `@/config/env` by updating `client.ts` to use `import.meta.env`.

### In Progress
1.  **Authentication and Company Management**
    *   Company context switching/reliability (Now handled via `useCompanyData` state - needs further testing)
    *   Role-based access implementation (Basic implementation using `useCompanyData`, RLS policies updated for PIRs/Tags - needs full review/completion)
    *   Error handling improvements (Partially addressed by React Query error states)
    *   Loading state refinement (Partially addressed by React Query loading states)

2.  **Question Bank and PIR System**
    *   Question bank UI refinement (Ongoing)
    *   PIR workflow implementation (Core creation/display fixed, response/review pending)
    *   Response submission system enhancement (Pending)
    *   Review process setup improvements (Pending)
    *   Validation implementation (Ongoing)
    *   **Server State:** Core data fetching/mutations refactored to use React Query.

3.  **Invite Supplier Flow (on `feature/user-invites-v2`)**
    *   [x] UI button ("Invite Supplier") added to Suppliers page.
    *   [x] `InviteSupplierModal` exists and is triggered by button.
    *   [x] `invite-user` Edge Function created (`supabase/functions/invite-user`).
    *   [x] `InviteSupplierModal` updated to call Edge Function.
    *   [x] `InviteSupplierModal` updated to create `companies` and `company_relationships` (pending) records before sending invite.
    *   [ ] Deploy Edge Function.
    *   [ ] Configure Redirect URLs in Supabase Auth settings.
    *   [ ] Implement Confirmation Handling logic (post-invite acceptance).
    *   [ ] Test full invite & confirmation flow.

### Pending Work
1.  **Core Authentication Flows**
    *   Robust multi-company context switching testing/refinement
    *   Complete role-based access control implementation & testing
    *   Enhanced role-based views

2.  **PIR System Development**
    *   Enhance response submission forms
    *   Develop review dashboard
    *   Improve status tracking/display (Refactor `SupplierProducts` status display, consider `SupplierDetail` count)
    *   Implement PIR email notifications (Supplier & Customer)
    *   Verify PIR creation/display on `main` branch baseline.
    *   Consider PIR-triggered invite logic.

3.  **Refactoring & Cleanup**
    *   **Complete React Query Rollout:** Apply pattern to remaining components/hooks.
    *   **Update Consumers:** Update components using old patterns.
    *   **Address `AppContext`:** Refactor/remove duplicated server state management.
    *   Refactor `utils.ts` functions using hardcoded URLs/project IDs.
    *   Consolidate Supabase client usage.
    *   Review schema design (contacts, roles, `pir_requests.note` column?).
    *   **Remove `<FormControl>` workaround:** Investigate root cause of `React.Children.only` error if possible, or document workaround.
    *   Remove temporary RLS test files (`temp_disable_product_rls.sql`).

4.  **Testing and Optimization**
    *   Authentication flow testing
    *   Company relationship validation
    *   Access control verification (especially updated RLS)
    *   PIR system testing (creation, display, suggestion workflow)
    *   Performance optimization
    *   Basic polish

5.  **Staging Deployment**
    *   [ ] Decide on branch to deploy (`main` + merged features?).
    *   [ ] Set up Staging Supabase project & environment variables.
    *   [ ] Apply migrations to Staging DB.
    *   [ ] Deploy Edge Functions to Staging project.
    *   [ ] Configure Auth Settings on Staging project.
    *   [ ] Build & Deploy frontend to Staging host.
    *   [ ] Test Staging environment thoroughly.

### Implementation Timeline
*   Continue implementing PIR workflow features (Response/Review)
*   Finish role-based access control review/testing
*   Complete testing of key features (PIR creation/display)
*   Focus on stability and performance

### Known Issues
1.  **High Priority**
    *   Need to refactor utility functions using hardcoded URLs/project IDs.
    *   Need to confirm correct Supabase client is used *everywhere*.
    *   Company state management may have timing edge cases.
    *   Root cause of `React.Children.only` error requiring `<FormControl>` removal workaround is unknown.

2.  **Medium Priority**
    *   Review schema design (contacts, roles, `pir_requests.note` column?).
    *   Implement remaining PIR workflow features (Response/Review).
    *   Implement PIR notifications.
    *   Implement Invite confirmation handling.
    *   Improve error handling in question bank management.

### Next Steps
1.  Deploy `invite-user` Edge Function.
2.  Implement Invite Confirmation Handling logic.
3.  Implement PIR Notifications.
4.  Complete React Query rollout and associated cleanup/consumer updates.
5.  Implement PIR Response/Review features.
6.  Refactor `utils.ts` to remove hardcoded URLs.
7.  Enhance testing coverage for critical features (PIR workflow, RLS, Invite Flow).
8.  Investigate/document the `<FormControl>` workaround.
9.  Plan and execute Staging Deployment.

### Success Metrics
- [x] Authentication system functional (`AuthContext`)
- [x] Local development environment operational
- [x] Basic Supplier creation working (Refactored w/ React Query)
- [x] Basic Tag creation working (Refactored w/ React Query)
- [x] Question creation (with tags) working reliably (Refactored w/ React Query)
- [x] Section/subsection organization implemented (DB + Refactored w/ React Query)
- [x] Company data fetching/context management (via `useCompanyData`)
- [x] Core Server State Management Refactored (React Query in key areas)
- [x] Invite Supplier UI elements added (`feature/user-invites-v2`)
- [x] Invite Supplier Edge Function created (`feature/user-invites-v2`)
- [x] Invite Supplier Modal calls Edge Function (`feature/user-invites-v2`)
- [x] Invite Supplier Modal creates pending Company/Relationship (`feature/user-invites-v2`)
- [ ] Invite Supplier Edge Function deployed
- [ ] Invite Supplier Confirmation Handling implemented
- [ ] Company relationships validated
- [ ] Role-based access working fully (Policies updated, needs full testing)
- [ ] PIR creation working on `main` baseline (Needs verification)
- [ ] PIR Notifications implemented
- [ ] Response submission functional
- [ ] Critical features tested (especially refactored areas & PIR workflow)

### Notes
- Significant progress with question bank implementation using section/subsection organization
- Fixed question-tag association issue using RPC functions
- Added extensive error handling and logging throughout the application
- Improved data model with clearer relationships between sections, subsections, and questions
- Enhanced loading state management across critical components
- Fixed inconsistencies in schema references between code and migrations
- **Resolved major PIR modal crash (`React.Children.only`) via workaround.**
- **Implemented product suggestion workflow for PIR creation.**
- **Fixed multiple RLS policy issues related to PIRs and Tags.**
- **Resolved data display issues on Supplier Detail, Supplier Products, and Supplier Card.**
- **Switched Invite Supplier feature development to new branch (`feature/user-invites-v2`) based on `main` due to schema incompatibilities.**
- **Resolved Vite import alias issue.**

## Today's Priorities (April 3, 2025) - Task List

**1. Invite Supplier Flow**
*   [x] Add "Invite Supplier" button to Suppliers page UI.
*   [x] Create `invite-user` Edge Function.
*   [x] Update `InviteSupplierModal` to call Edge Function.
*   [x] Update `InviteSupplierModal` to create pending Company & Relationship records before invite.
*   [ ] Deploy `invite-user` Edge Function.
*   [ ] Configure Supabase Auth Redirect URLs.
*   [ ] Implement Invite Confirmation Handling (post-acceptance logic).
*   [ ] Test end-to-end invite flow.

**2. Product Information Request (PIR) Flow**
*   [ ] Verify PIR Creation/Display works correctly on `feature/user-invites-v2` (based on `main` schema).
*   [ ] Implement Supplier Notification (on PIR creation).
*   [ ] Implement Customer Notification (on PIR submission).
*   [ ] Test basic PIR flow & notifications.
*   [ ] Review/Test Supplier Response Form (`SupplierResponseForm.tsx`).
*   [ ] Review/Test Customer Review Page (`CustomerReview.tsx`).

**3. Staging Deployment**
*   [ ] Decide on branch/commit to deploy.
*   [ ] Merge required features into deployment branch.
*   [ ] Set up/Verify Staging Supabase project & environment.
*   [ ] Apply migrations to Staging DB.
*   [ ] Deploy Edge Functions to Staging.
*   [ ] Configure Auth Settings on Staging.
*   [ ] Build & Deploy frontend to Staging host.
*   [ ] Test Staging environment.
