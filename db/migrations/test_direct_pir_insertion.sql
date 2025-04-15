-- Script to test direct insertion of a PIR request with status 'sent'
-- This script attempts to insert a PIR request directly into the database

-- First, let's check the current enum values
SELECT enum_range(NULL::pir_status);

-- Disable the email notification trigger temporarily
ALTER TABLE pir_requests DISABLE TRIGGER send_pir_notification_trigger;

-- Test direct insertion with status 'sent'
DO $$
DECLARE
  company_id uuid;
  supplier_id uuid;
  product_id uuid;
  inserted_id uuid;
BEGIN
  -- Get a valid company ID
  SELECT id INTO company_id FROM companies LIMIT 1;
  
  -- Get a valid supplier ID
  SELECT id INTO supplier_id FROM suppliers LIMIT 1;
  
  -- Get a valid product ID
  SELECT id INTO product_id FROM products LIMIT 1;
  
  IF company_id IS NOT NULL AND supplier_id IS NOT NULL AND product_id IS NOT NULL THEN
    -- Insert a test PIR request with status 'sent'
    INSERT INTO pir_requests (
      company_id,
      supplier_id,
      product_id,
      status,
      title,
      description,
      due_date
    ) VALUES (
      company_id,
      supplier_id,
      product_id,
      'sent',
      'Test PIR Request',
      'This is a test PIR request created directly in the database',
      NOW() + INTERVAL '30 days'
    ) RETURNING id INTO inserted_id;
    
    RAISE NOTICE 'Test PIR request with status ''sent'' created successfully with ID: %', inserted_id;
    
    -- Verify the insertion
    RAISE NOTICE 'Verifying insertion...';
    PERFORM * FROM pir_requests WHERE id = inserted_id AND status = 'sent';
    IF FOUND THEN
      RAISE NOTICE 'Verification successful. PIR request with status ''sent'' exists in the database.';
    ELSE
      RAISE NOTICE 'Verification failed. PIR request with status ''sent'' not found in the database.';
    END IF;
  ELSE
    RAISE NOTICE 'Could not find valid company, supplier, or product IDs for test insertion.';
  END IF;
END $$;

-- Re-enable the trigger
ALTER TABLE pir_requests ENABLE TRIGGER send_pir_notification_trigger;

-- Check if there are any constraints on the status column
SELECT
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM
  information_schema.table_constraints tc
JOIN
  information_schema.check_constraints cc
ON
  tc.constraint_name = cc.constraint_name
WHERE
  tc.table_name = 'pir_requests'
  AND cc.check_clause LIKE '%status%';

-- Check for any triggers on the pir_requests table
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM
  information_schema.triggers
WHERE
  event_object_table = 'pir_requests';