#!/bin/bash
set -e

# Configuration
DEV_PROJECT_ID="oecravfbvupqgzfyizsi"
STAGING_PROJECT_ID="fubuiiecraslloezxshs"
VALIDATION_REPORT="migration_validation_report.txt"
VALIDATION_QUERIES="validation_queries.sql"

echo "=== Validating Supabase Migration ==="
echo "From: $DEV_PROJECT_ID (Development)"
echo "To:   $STAGING_PROJECT_ID (Staging)"
echo "===================================="

# Create validation queries
cat > "$VALIDATION_QUERIES" << EOL
-- Validation Queries
-- These queries compare the schema and data between development and staging projects

-- Schema Validation Queries
-- Count of tables
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';

-- Count of enum types
SELECT COUNT(*) AS enum_count FROM pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
WHERE n.nspname = 'public' AND t.typtype = 'e';

-- List of enum types and their values
SELECT t.typname AS enum_name, 
       array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public' AND t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;

-- Data Validation Queries
-- Count of records in each table
SELECT 'companies' AS table_name, COUNT(*) AS record_count FROM companies
UNION ALL
SELECT 'company_relationships' AS table_name, COUNT(*) AS record_count FROM company_relationships
UNION ALL
SELECT 'company_users' AS table_name, COUNT(*) AS record_count FROM company_users
UNION ALL
SELECT 'pir_requests' AS table_name, COUNT(*) AS record_count FROM pir_requests
UNION ALL
SELECT 'pir_responses' AS table_name, COUNT(*) AS record_count FROM pir_responses
UNION ALL
SELECT 'pir_tags' AS table_name, COUNT(*) AS record_count FROM pir_tags
UNION ALL
SELECT 'product_answer_history' AS table_name, COUNT(*) AS record_count FROM product_answer_history
UNION ALL
SELECT 'product_answers' AS table_name, COUNT(*) AS record_count FROM product_answers
UNION ALL
SELECT 'products' AS table_name, COUNT(*) AS record_count FROM products
UNION ALL
SELECT 'profiles' AS table_name, COUNT(*) AS record_count FROM profiles
UNION ALL
SELECT 'question_sections' AS table_name, COUNT(*) AS record_count FROM question_sections
UNION ALL
SELECT 'question_tags' AS table_name, COUNT(*) AS record_count FROM question_tags
UNION ALL
SELECT 'questions' AS table_name, COUNT(*) AS record_count FROM questions
UNION ALL
SELECT 'response_comments' AS table_name, COUNT(*) AS record_count FROM response_comments
UNION ALL
SELECT 'response_flags' AS table_name, COUNT(*) AS record_count FROM response_flags
UNION ALL
SELECT 'tags' AS table_name, COUNT(*) AS record_count FROM tags
UNION ALL
SELECT 'pir_response_component_materials' AS table_name, COUNT(*) AS record_count FROM pir_response_component_materials
UNION ALL
SELECT 'pir_response_components' AS table_name, COUNT(*) AS record_count FROM pir_response_components
UNION ALL
SELECT 'pir_response_comments' AS table_name, COUNT(*) AS record_count FROM pir_response_comments
ORDER BY table_name;
EOL

echo "Created validation queries at $VALIDATION_QUERIES"
echo "To validate the migration:"
echo "1. Open the Supabase SQL Editor for your development project"
echo "   https://app.supabase.com/project/$DEV_PROJECT_ID/sql/new"
echo "2. Run the validation queries from $VALIDATION_QUERIES and save the results"
echo "3. Open the Supabase SQL Editor for your staging project"
echo "   https://app.supabase.com/project/$STAGING_PROJECT_ID/sql/new"
echo "4. Run the same validation queries and compare the results"
echo "5. Document any discrepancies in $VALIDATION_REPORT"
echo ""
echo "The migration is successful if:"
echo "- Both projects have the same number of tables"
echo "- Both projects have the same enum types with identical values"
echo "- The record counts in each table match between projects"
echo "===================================="

# Create an empty validation report
cat > "$VALIDATION_REPORT" << EOL
# Migration Validation Report

## Schema Validation
- [ ] Same number of tables in both projects
- [ ] Same enum types with identical values in both projects

## Data Validation
- [ ] Same number of records in each table between projects

## Discrepancies
(Document any discrepancies here)

## Conclusion
(Indicate whether the migration was successful or not)
EOL

echo "Created validation report template at $VALIDATION_REPORT"
echo "Please fill in the validation report after running the validation queries"