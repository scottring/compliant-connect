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
- **PIR Flow Implementation (Supplier Response & Customer Review):**
    - Established relationship between test companies (Stacks Data & Supplier2).
    - Associated existing user (`smkaufman+s2@gmail.com`) with Supplier2 company.
    - Refactored `OurProducts.tsx` (supplier view) to fetch and display incoming PIRs instead of products.
    - Debugged and fixed data fetching, state management, type errors, and rendering issues in `OurProducts.tsx`.
    - Implemented answer saving (`upsert`) in `SupplierResponseForm.tsx` via `useMutation`.
    - Implemented PIR submission (`update` status) in `SupplierResponseForm.tsx` via `useMutation`.
    - Corrected data fetching logic in `SupplierResponseForm.tsx` to load questions based on PIR tags.
    - Corrected type definitions (`PirRequest`, `Section`, `Subsection`, `Flag`, `Question`) and fixed related errors.
    - Corrected rendering logic in `CustomerReview.tsx` and `ReviewQuestionItem.tsx` to display questions even without existing answers.
    - Verified Approve/Flag controls logic in `CustomerReview.tsx` and `ReviewQuestionItem.tsx`.
- **Email Notifications (PIR Flow):**
    - Created `send-pir-notification` Edge Function using SendGrid.
    - Configured function with API key secret and sender email.
    - Deployed function.
    - Integrated function calls into `RequestSheetModal.tsx` (PIR Creation), `SupplierResponseForm.tsx` (Response Submission), and `CustomerReview.tsx` (Review Submission).
    - Debugged function invocation issues.
- **Code Cleanup:**
    - Removed numerous `console.log`, `console.error`, `console.warn` statements from multiple files.
    - Fixed syntax errors introduced during log removal.
    - Removed unused imports.

### In Progress
1.  **Authentication and Company Management**
    *   Company context switching/reliability (Now handled via `useCompanyData` state - needs further testing)
    *   Role-based access implementation (Basic implementation using `useCompanyData`, RLS policies updated/reviewed - needs full review/completion)
    *   Error handling improvements (Partially addressed by React Query error states)
    *   Loading state refinement (Partially addressed by React Query loading states)

2.  **Question Bank and PIR System**
    *   Question bank UI refinement (Ongoing)
    *   PIR workflow implementation (Core creation, supplier response, customer review implemented - needs testing & refinement, especially iterative review)
    *   Response submission system enhancement (Basic save implemented, needs review)
    *   Review process setup improvements (Basic approve/flag implemented, needs review/testing)
    *   Validation implementation (Ongoing)
    *   **Server State:** Core data fetching/mutations refactored to use React Query.

3.  **Invite Supplier Flow (on `feature/user-invites-v2`)**
    *   [x] UI button ("Invite Supplier") added to Suppliers page.
    *   [x] `InviteSupplierModal` exists and is triggered by button.
    *   [x] `invite-user` Edge Function created (`supabase/functions/invite-user`).
    *   [x] `InviteSupplierModal` updated to call Edge Function.
    *   [x] `InviteSupplierModal` updated to create `companies` and `company_relationships` (pending) records before sending invite.
    *   [x] Deploy Edge Function.
    *   [x] Configure Redirect URLs in Supabase Auth settings.
    *   [ ] Implement Confirmation Handling logic (post-invite acceptance). (Page created, logic needs testing/refinement)
    *   [ ] Test full invite & confirmation flow.

### Pending Work
1.  **Core Authentication Flows**
    *   Robust multi-company context switching testing/refinement
    *   Complete role-based access control implementation & testing
    *   Enhanced role-based views

2.  **PIR System Development**
    *   Enhance response submission forms (e.g., file uploads)
    *   Develop review dashboard/overview
    *   Improve status tracking/display (Refactor `SupplierProducts` status display, consider `SupplierDetail` count)
    *   Test PIR email notifications thoroughly.
    *   Implement iterative review flow (supplier responding to flags).
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
    *   Review/Standardize import paths (alias vs relative).

4.  **Testing and Optimization**
    *   Authentication flow testing
    *   Company relationship validation
    *   Access control verification (especially updated RLS)
    *   PIR system testing (creation, display, response, review, notifications)
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
*   Test and refine PIR workflow features (Response/Review/Notifications)
*   Finish role-based access control review/testing
*   Complete testing of key features (PIR workflow, RLS, Invite Flow)
*   Focus on stability and performance

### Known Issues
1.  **High Priority**
    *   Need to refactor utility functions using hardcoded URLs/project IDs.
    *   Need to confirm correct Supabase client is used *everywhere*.
    *   Company state management may have timing edge cases.
    *   Root cause of `React.Children.only` error requiring `<FormControl>` removal workaround is unknown.
    *   Inconsistent import path usage (`@/` vs relative) causing TS errors intermittently.

2.  **Medium Priority**
    *   Review schema design (contacts, roles, `pir_requests.note` column?).
    *   Implement iterative PIR review flow (supplier responding to flags).
    *   Implement Invite confirmation handling.
    *   Improve error handling in question bank management.

### Next Steps
1.  Test end-to-end PIR flow (Request -> Response -> Review -> Approve/Flag -> Notification).
2.  Implement Invite Confirmation Handling logic.
3.  Complete React Query rollout and associated cleanup/consumer updates.
4.  Refactor `utils.ts` to remove hardcoded URLs.
5.  Enhance testing coverage for critical features (PIR workflow, RLS, Invite Flow).
6.  Investigate/document the `<FormControl>` workaround.
7.  Standardize import paths.
8.  Plan and execute Staging Deployment.

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
- [x] Invite Supplier Edge Function deployed
- [x] PIR Creation working (including product suggestion)
- [x] PIR Display working for Supplier (`OurProducts.tsx` refactored)
- [x] PIR Response Form (`SupplierResponseForm.tsx`) loads correct questions based on PIR tags.
- [x] PIR Response saving implemented (`updateAnswerMutation`).
- [x] PIR Response submission implemented (`submitPirMutation`).
- [x] PIR Customer Review page (`CustomerReview.tsx`) displays questions correctly (even if unanswered).
- [x] PIR Customer Review Approve/Flag state logic implemented.
- [x] PIR Customer Review submission implemented (`submitReviewMutation`).
- [x] Email Notification Edge Function (`send-pir-notification`) created and deployed (using SendGrid).
- [x] Email Notifications integrated for PIR Creation, Response Submission, and Review Submission.
- [ ] Invite Supplier Confirmation Handling implemented
- [ ] Company relationships validated
- [ ] Role-based access working fully (Policies updated, needs full testing)
- [ ] Critical features tested (PIR workflow end-to-end, RLS, Invite Flow)

### Notes
- Significant progress with question bank implementation using section/subsection organization
- Fixed question-tag association issue using RPC functions
- Added extensive error handling and logging throughout the application (then removed logs for clarity)
- Improved data model with clearer relationships between sections, subsections, and questions
- Enhanced loading state management across critical components
- Fixed inconsistencies in schema references between code and migrations
- **Resolved major PIR modal crash (`React.Children.only`) via workaround.**
- **Implemented product suggestion workflow for PIR creation.**
- **Fixed multiple RLS policy issues related to PIRs and Tags.**
- **Resolved data display issues on Supplier Detail, Supplier Products, and Supplier Card.**
- **Switched Invite Supplier feature development to new branch (`feature/user-invites-v2`) based on `main` due to schema incompatibilities.**
- **Resolved Vite import alias issue.**
- **Refactored PIR flow components (`OurProducts`, `SupplierResponseForm`, `CustomerReview`) significantly to fix data fetching, state, rendering, and type issues.**
- **Implemented core PIR email notification flow using Edge Function + SendGrid.**

## Today's Progress (April 4, 2025)

*   **PIR Flow Setup & Debugging:**
    *   Established relationship between "Stacks Data" and "Supplier2".
    *   Associated user `smkaufman+s2@gmail.com` with "Supplier2".
    *   Refactored `OurProducts.tsx` (supplier view) to fetch/display incoming PIRs.
    *   Debugged data fetching, state, types, rendering in `OurProducts.tsx`.
    *   Implemented answer saving & PIR submission in `SupplierResponseForm.tsx`.
    *   Corrected question fetching logic in `SupplierResponseForm.tsx` (based on PIR tags).
    *   Corrected rendering logic in `CustomerReview.tsx` & `ReviewQuestionItem.tsx` to show questions without answers and display Approve/Flag controls.
    *   Fixed type errors (`order_index`, `createdAt`/`created_at`, imports).
    *   Fixed hoisting/syntax errors.
*   **Email Notifications:**
    *   Created & deployed `send-pir-notification` Edge Function (using SendGrid).
    *   Integrated function calls into `RequestSheetModal.tsx`, `SupplierResponseForm.tsx`, `CustomerReview.tsx`.
    *   Debugged function invocation failure.
*   **Code Cleanup:**
    *   Removed extensive `console.log` statements from multiple files.
    *   Fixed syntax errors caused by log removal.
    *   Removed unused imports.

## Today's Progress (April 7, 2025)

*   **Data Reset Functionality:**
    *   Created `create_reset_data_function.sql` migration to add a `reset_data()` function in Supabase.
    *   Created `src/utils/resetData.ts` utility function to call the Supabase RPC.
    *   Added a "Reset Data" button to the `AdminSettings` page that uses this utility.
*   **List Table Question Type:**
    *   Added `list_table` enum value to `question_type` in `supabase/migrations/20250407154500_add_list_table_question_type.sql`.
    *   Updated `create_question_with_tags` function to handle `list_table` type and its `table_schema` in `supabase/migrations/20250407155700_alter_create_question_with_tags_function.sql`.
    *   Created `src/components/questionBank/TableBuilder.tsx` component to define the schema for `list_table` questions.
    *   Integrated `TableBuilder` into `src/components/questionBank/QuestionBuilderDialog.tsx`.
    *   Updated `src/types/index.ts` with `table_schema` property for `Question` type.
    *   Updated `src/hooks/use-question-bank.ts` to handle the new question type and schema.
    *   Updated `src/components/supplierResponse/QuestionItem.tsx` to render the `list_table` question type (basic structure, needs table rendering implementation).
