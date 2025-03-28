# Project Progress

## MVP Development Status (Target: 3 PM Today)

### Completed Features
- Initial UI components setup
- Basic database schema
- Supabase integration
- Local development setup (Docker, Supabase CLI)
- Streamlined MCP configuration (using global settings)
- Basic "Add Supplier" functionality (name only initially, then with contacts)
- Basic "Create Tag" functionality
- Basic "Create Question" functionality (excluding tag association persistence due to caching issue)

### In Progress
1.  **Authentication and Company Management**
    *   Company context switching/reliability (Addressed default company setting logic, but potential timing issues remain if `currentCompany` is needed immediately after state change)
    *   Role-based access implementation (Basic RLS policies added, including tag creation)
    *   Error handling improvements (Added specific error handling/logging in AuthContext)
    *   Loading state refinement (Added `authLoading` check to Suppliers page)

2.  **Question Bank and PIR System**
    *   Question bank schema design (Identified and fixed several schema mismatches in code vs. migrations)
    *   PIR workflow implementation (Refactored SupplierProducts page to use `pir_requests` table)
    *   Response submission system
    *   Review process setup
    *   Basic validation
    *   **Fixing Question/Tag Association:** Implemented DB function `create_question_with_tags` and updated hook to use RPC. **Persistent caching issue** prevents this from working correctly in the running app.

### Pending Work
1.  **Core Authentication Flows**
    *   Robust company context switching (Ensure `currentCompany` is reliably available when needed)
    *   Refine Role-based access control (e.g., for tag/question creation)

2.  **PIR System Development**
    *   Complete Question bank management UI (Fix persistent caching issue blocking question creation)
    *   PIR creation interface
    *   Response submission forms
    *   Review dashboard
    *   Status tracking (Refactor `SupplierProducts` status display)

3.  **Refactoring & Cleanup**
    *   Refactor `utils.ts` functions using hardcoded URLs/project IDs (`checkAndFixRlsPolicies`, `checkAndCreateTables`, etc.)
    *   Consolidate Supabase client usage (ensure only `@/lib/supabase` is used).
    *   Review schema design (e.g., contact info on `companies` vs. `profiles`).

4.  **Testing and Optimization**
    *   Authentication flow testing
    *   Company relationship validation
    *   Access control verification
    *   PIR system testing
    *   Performance optimization
    *   Basic polish

### Implementation Timeline (Needs Revision)
*   Previous timeline outdated due to extensive debugging.

### Known Issues
1.  **Critical**
    *   **Persistent Caching/Build Issue:** Application executes stale code for `addQuestion` despite file changes, cache clears, and restarts. Prevents saving questions with tags.
    *   Company state management might still have timing issues (`currentCompany` update propagation).

2.  **High Priority**
    *   Need to refactor utility functions using hardcoded URLs/project IDs.
    *   Need to confirm correct Supabase client is used *everywhere*.

3.  **Medium Priority**
    *   Review schema design (contacts, roles).
    *   Implement remaining PIR workflow features.

### Next Steps (Revised)
1.  **Resolve Caching/Build Issue:** Investigate why Vite/browser serves stale code for `useQuestionBank.ts`. (May require environment-specific debugging).
2.  Verify `addQuestion` works correctly once caching issue is resolved.
3.  Refactor `utils.ts` to remove hardcoded URLs.
4.  Continue implementing PIR system features.

### Success Metrics
- [x] Authentication system functional (with default company logic)
- [x] Local development environment operational
- [x] Basic Supplier creation working
- [x] Basic Tag creation working
- [ ] Question creation (with tags) working reliably
- [ ] Company relationships validated
- [ ] Role-based access working fully
- [ ] PIR creation working
- [ ] Response submission functional
- [ ] Critical features tested

### Notes
- Extensive debugging performed on 2025-03-28 related to Supabase connection (SSL), environment variables, schema mismatches, RLS policies, and React state timing.
- Switched to local Supabase dev environment.
- Added contact columns to `companies` table via migration.
- Refactored `AuthContext` to handle default company creation/association more robustly.
- Refactored `useQuestionBank` to use RPC for question creation due to client library issues.
- **Main Blocker:** Persistent caching/build issue preventing latest `useQuestionBank` code from running.
