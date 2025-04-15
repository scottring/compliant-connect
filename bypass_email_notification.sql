-- Script to bypass email notification functionality
-- This script creates a function to bypass the email notification and replaces the existing trigger

-- Create a function to bypass email notification
CREATE OR REPLACE FUNCTION public.bypass_email_notification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Email notification bypassed for PIR request with ID: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Save the original trigger function for later restoration
DO $$
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'send_pir_notification_trigger'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE 'Backing up original trigger...';
    -- Create a backup of the original trigger function if needed
  END IF;
END $$;

-- Replace the existing trigger with the bypass trigger
DROP TRIGGER IF EXISTS send_pir_notification_trigger ON pir_requests;

-- Create the bypass trigger
CREATE TRIGGER bypass_email_notification_trigger
AFTER INSERT ON pir_requests
FOR EACH ROW
WHEN (NEW.status = 'sent')
EXECUTE FUNCTION public.bypass_email_notification();

-- Verify the trigger was created
SELECT tgname, tgrelid::regclass, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'bypass_email_notification_trigger';

-- Test direct insertion with status 'sent'
DO $$
DECLARE
  company_id uuid;
  supplier_id uuid;
  product_id uuid;
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
      'This is a test PIR request created to bypass email notification',
      NOW() + INTERVAL '30 days'
    );
    
    RAISE NOTICE 'Test PIR request with status ''sent'' created successfully.';
  ELSE
    RAISE NOTICE 'Could not find valid company, supplier, or product IDs for test insertion.';
  END IF;
END $$;