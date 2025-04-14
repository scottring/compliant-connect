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
