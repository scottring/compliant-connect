-- Check the enum type definition
SELECT t.typname, e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'pir_status'
ORDER BY e.enumsortorder;

-- Check the table structure
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'pir_requests'
AND column_name = 'status';

-- Check current values in the table
SELECT DISTINCT status
FROM public.pir_requests;

-- Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'pir_requests'; 