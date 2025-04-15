# Migrating from Categories to Sections

This document outlines the steps to migrate from the current `question_categories` table-based approach to a clearer `question_sections` based approach.

## Why This Change?

In our application, we have been using:

- Database: `question_categories` table with a parent/child relationship
- UI: Referring to these as "sections" and "subsections"

This mismatch creates confusion and requires constant mental mapping. The goal is to align the database terminology with the UI terminology.

## Database Changes

1. Run the `rename_categories_to_sections.sql` script to:
   - Rename the `question_categories` table to `question_sections`
   - Rename `parent_id` to `parent_section_id`
   - Update foreign key constraints and references
   - Rename RLS policies

```sql
-- Example command to run the migration
cd /path/to/project
psql -U your_user -d your_database -f rename_categories_to_sections.sql
```

## Code Changes

### TypeScript Type Updates

1. Rename `QuestionCategory` to `QuestionSection` in `src/hooks/use-question-bank.ts`
2. Update the property `parent_id` to `parent_section_id`

### Hook Updates

1. In `src/hooks/use-question-bank.ts`:
   - Rename `loadCategories` to `loadSections`
   - Rename `addCategory` to `addSection`
   - Rename `updateCategory` to `updateSection`
   - Rename `deleteCategory` to `deleteSection`
   - Update the database table references from `question_categories` to `question_sections`

### AppContext Updates

1. In `src/context/AppContext.tsx`:
   - Rename `refreshCategories` to `refreshSections`
   - Update references to the renamed hooks
   - Rename `dbCategories` to `dbSections`
   - Update all references to use "section" terminology consistently

### Component Updates

1. Update component references as needed:
   - QuestionBuilderDialog
   - QuestionBank page
   - Any other components that directly reference categories

## Testing

After completing the migration:

1. Verify that the Sections debug panel shows the correct data
2. Create a new Section and verify it appears in the dropdown
3. Create a new Question with a Section and verify it saves properly
4. Check that existing Sections/Subsections are still accessible

## Rollback Plan

If issues occur, you can:

1. Restore the database from backup
2. Roll back the code changes
3. Run the reverse migration script

```sql
-- Reverse migration (if needed)
ALTER TABLE question_sections RENAME TO question_categories;
ALTER TABLE questions RENAME COLUMN section_id TO category_id;
ALTER TABLE question_categories RENAME COLUMN parent_section_id TO parent_id;
```

## Benefits

- Clearer terminology throughout the application
- More intuitive database schema
- Reduced mental mapping between UI and database concepts
- Easier onboarding for new developers 