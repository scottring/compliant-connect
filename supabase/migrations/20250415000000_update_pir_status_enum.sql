-- First, create a temporary table to store current statuses
CREATE TABLE temp_pir_requests_status AS 
SELECT id, status::text as status_text 
FROM pir_requests;

-- Drop dependent objects
DROP VIEW IF EXISTS pir_access_view CASCADE;

-- Drop the trigger that might prevent enum updates
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON pir_requests;
DROP FUNCTION IF EXISTS validate_pir_status_transition();

-- Alter the column to text temporarily
ALTER TABLE pir_requests 
ALTER COLUMN status TYPE text;

-- Drop and recreate the enum with new values
DROP TYPE public.pir_status CASCADE;
CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'sent',
    'in_progress',
    'submitted',
    'reviewed',
    'rejected',
    'resubmitted',
    'canceled'
);

-- Update the column type back to enum
ALTER TABLE pir_requests 
ALTER COLUMN status TYPE public.pir_status 
USING status::public.pir_status;

-- Recreate the trigger function with all valid transitions
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'in_progress' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'resubmitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'reviewed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'reviewed' AND NEW.status = 'rejected' THEN -- Add this transition
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_pir_status_transition_trigger
    BEFORE UPDATE OF status ON public.pir_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pir_status_transition();

-- Recreate the view
CREATE OR REPLACE VIEW public.pir_access_view AS
SELECT 
    pir.id,
    pir.product_id,
    pir.customer_id,
    pir.supplier_company_id,
    pir.title,
    pir.description,
    pir.status,
    pir.due_date,
    pir.created_at,
    pir.updated_at,
    p.name AS product_name,
    c1.name AS customer_name,
    c2.name AS supplier_name
FROM public.pir_requests pir
LEFT JOIN public.products p ON pir.product_id = p.id
JOIN public.companies c1 ON pir.customer_id = c1.id
JOIN public.companies c2 ON pir.supplier_company_id = c2.id;

-- Clean up
DROP TABLE temp_pir_requests_status; 