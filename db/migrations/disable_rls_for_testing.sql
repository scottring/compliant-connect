-- Disable RLS for Testing in Staging Environment

-- 1. Disable RLS on pir_requests table
ALTER TABLE pir_requests DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on pir_responses table
ALTER TABLE pir_responses DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on pir_tags table
ALTER TABLE pir_tags DISABLE ROW LEVEL SECURITY;

-- 4. Disable RLS on response_flags table
ALTER TABLE response_flags DISABLE ROW LEVEL SECURITY;

-- 5. Disable RLS on response_comments table
ALTER TABLE response_comments DISABLE ROW LEVEL SECURITY;

-- 6. Disable RLS on pir_response_comments table
ALTER TABLE pir_response_comments DISABLE ROW LEVEL SECURITY;

-- 7. Disable RLS on question_tags table
ALTER TABLE question_tags DISABLE ROW LEVEL SECURITY;

-- 8. Verify RLS status
SELECT 
    n.nspname as schema,
    c.relname as table_name,
    CASE WHEN c.relrowsecurity THEN 'RLS enabled' ELSE 'RLS disabled' END as rls_status
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relkind = 'r' -- Only tables
    AND n.nspname = 'public'
    AND c.relname IN (
        'pir_requests', 
        'pir_responses', 
        'pir_tags', 
        'response_flags', 
        'response_comments', 
        'pir_response_comments', 
        'question_tags'
    )
ORDER BY 
    n.nspname, c.relname;

-- Note: To re-enable RLS after testing, run the following:
/*
-- 1. Re-enable RLS on pir_requests table
ALTER TABLE pir_requests ENABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS on pir_responses table
ALTER TABLE pir_responses ENABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS on pir_tags table
ALTER TABLE pir_tags ENABLE ROW LEVEL SECURITY;

-- 4. Re-enable RLS on response_flags table
ALTER TABLE response_flags ENABLE ROW LEVEL SECURITY;

-- 5. Re-enable RLS on response_comments table
ALTER TABLE response_comments ENABLE ROW LEVEL SECURITY;

-- 6. Re-enable RLS on pir_response_comments table
ALTER TABLE pir_response_comments ENABLE ROW LEVEL SECURITY;

-- 7. Re-enable RLS on question_tags table
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
*/