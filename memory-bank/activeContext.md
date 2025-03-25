# Active Context

## Current Focus
Setting up proper development, staging, and production environments before proceeding with authentication implementation.

## Recent Changes
1. Completed core UI components and workflows:
   - Question bank management
   - PIR creation and management
   - Supplier response forms
   - Review process
   - Product sheet management

2. Refined terminology:
   - "Sheet Request" → "Product Information Request (PIR)"
   - Clarified distinction between PIRs and Product Sheets
   - Standardized status terminology

3. Implemented workflow improvements:
   - Status changes now properly reflect form state
   - Review process shows only open flagged issues
   - Improved supplier response form UX
   - Added bulk import for question options

4. Added MCP capabilities for database analysis:
   - Configured MCP servers for all three Supabase environments (dev, staging, production)
   - Created documentation for MCP usage in `docs/supabase-mcp.md`
   - Set up secure read-only connections to databases
   - Enabled cross-environment data verification
   - Added advanced MCP server with write capabilities
   - Created scripts to easily start MCP servers for each environment
   - Added comprehensive documentation for advanced features

## Active Decisions
1. Environment Setup Requirements
   - Development environment for local work
   - Staging environment for testing
   - Production environment for live deployment
   - Separate Supabase instances for each environment
   - Environment-specific configuration management

2. User Role Management
   - Companies can be both suppliers and customers
   - Role-based access control needed
   - Company relationships must be properly tracked

3. Data Model Requirements
   - Company relationships table needed
   - Proper filtering based on authenticated user's company
   - Row Level Security implementation in Supabase

## Next Steps
1. Environment Setup
   - ✅ Configure development environment
   - ✅ Set up staging environment
   - ✅ Configure production environment
   - Implement environment switching
   - Set up CI/CD pipeline

2. Authentication Implementation
   - Set up Supabase authentication
   - Implement proper user session management
   - Add role-based access control

3. Backend Integration
   - Replace mock data with real database queries
   - Implement proper relationship filtering
   - Set up Row Level Security
   - Use MCP to verify database state across environments
   - Use advanced MCP server for schema management and initial data loading

## Known Issues
1. Company relationship filtering not properly implemented
2. User role-based views need refinement
3. Product dropdown in PIR creation needs company-specific filtering
4. Toast notifications too frequent during form input 