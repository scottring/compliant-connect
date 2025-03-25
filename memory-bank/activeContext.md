# Active Context

## Current Focus
Authentication implementation is the next major focus area for development.

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

## Active Decisions
1. User Role Management
   - Companies can be both suppliers and customers
   - Role-based access control needed
   - Company relationships must be properly tracked

2. Data Model Requirements
   - Company relationships table needed
   - Proper filtering based on authenticated user's company
   - Row Level Security implementation in Supabase

## Next Steps
1. Authentication Implementation
   - Set up Supabase authentication
   - Implement proper user session management
   - Add role-based access control

2. Backend Integration
   - Replace mock data with real database queries
   - Implement proper relationship filtering
   - Set up Row Level Security

3. UX Improvements
   - Question preview functionality
   - Improved status notifications
   - Enhanced bulk import capabilities

## Known Issues
1. Company relationship filtering not properly implemented
2. User role-based views need refinement
3. Product dropdown in PIR creation needs company-specific filtering
4. Toast notifications too frequent during form input 