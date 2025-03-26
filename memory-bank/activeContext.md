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

## Directory Structure Status

### Current Structure Assessment
The project currently has a solid foundation with clear separation of concerns, but some areas need optimization:

#### Strengths
- Clear separation of core concerns (components, pages, context, etc.)
- Well-organized infrastructure (migrations, scripts, docs)
- Proper configuration file placement
- Memory bank structure follows best practices

#### Areas for Improvement
1. **Components Directory**
   - Need to reorganize into feature-based structure
   - Move shared components to common directory
   - Separate layout components
   - Current Status: Partially organized, needs restructuring

2. **Pages Directory**
   - Currently flat structure needs feature-based organization
   - Missing proper lazy loading implementation
   - Current Status: Functional but needs reorganization

3. **Utils Directory**
   - Needs better categorization
   - API utilities should be separated
   - Current Status: Basic structure, needs expansion

4. **Types Organization**
   - Could benefit from domain-based organization
   - Some types could be co-located with features
   - Current Status: Basic structure, needs enhancement

### Next Steps
1. Create new directory structure according to systemPatterns.md guidelines
2. Move components to feature-based organization
3. Implement proper lazy loading for pages
4. Reorganize utils and types directories
5. Update import statements systematically
6. Add README files to key directories

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