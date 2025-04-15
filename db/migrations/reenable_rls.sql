-- Re-enable RLS on tables after testing

-- 1. Re-enable RLS on pir_requests table
ALTER TABLE pir_requests ENABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS on pir_responses table
ALTER TABLE pir_responses ENABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 4. Re-enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. Verify RLS status
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
        'companies', 
        'products'
    )
ORDER BY 
    n.nspname, c.relname;