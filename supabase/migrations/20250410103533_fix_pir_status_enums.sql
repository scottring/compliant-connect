-- Drop existing enums (need to drop dependent objects first)
DROP VIEW IF EXISTS public.pir_access_view;

-- Drop tables that depend on the enums
ALTER TABLE public.pir_responses 
  DROP CONSTRAINT IF EXISTS pir_responses_status_check;

ALTER TABLE public.pir_requests 
  DROP CONSTRAINT IF EXISTS pir_requests_status_check;

-- Drop and recreate pir_status enum with correct values
DROP TYPE IF EXISTS public.pir_status CASCADE;
CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'submitted',
    'in_review',
    'flagged',
    'approved',
    'rejected'
);

-- Drop and recreate response_status enum with correct values
DROP TYPE IF EXISTS public.response_status CASCADE;
CREATE TYPE public.response_status AS ENUM (
    'draft',
    'submitted',
    'flagged',
    'approved'
);

-- Add back the enum constraints and columns
ALTER TABLE public.pir_requests
    ADD COLUMN IF NOT EXISTS status public.pir_status DEFAULT 'draft'::public.pir_status NOT NULL,
    ADD CONSTRAINT pir_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_review'::text, 'flagged'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE public.pir_responses
    ADD COLUMN IF NOT EXISTS status public.response_status DEFAULT 'draft'::public.response_status NOT NULL,
    ADD CONSTRAINT pir_responses_status_check CHECK (status::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'flagged'::text, 'approved'::text]));

-- Recreate the pir_access_view
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
LEFT JOIN public.products p ON p.id = pir.product_id
JOIN public.companies c1 ON c1.id = pir.customer_id
JOIN public.companies c2 ON c2.id = pir.supplier_company_id;

-- Add function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_review' AND NEW.status IN ('approved', 'flagged', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for PIR status transitions
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON public.pir_requests;
CREATE TRIGGER validate_pir_status_transition_trigger
  BEFORE UPDATE OF status ON public.pir_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pir_status_transition();

-- Add function to validate response status transitions
CREATE OR REPLACE FUNCTION public.validate_response_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('approved', 'flagged') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid response status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for response status transitions
DROP TRIGGER IF EXISTS validate_response_status_transition_trigger ON public.pir_responses;
CREATE TRIGGER validate_response_status_transition_trigger
  BEFORE UPDATE OF status ON public.pir_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_response_status_transition();
