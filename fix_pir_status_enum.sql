-- First, let's verify the current enum values
SELECT e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'pir_status' AND n.nspname = 'public';

-- Drop dependent objects
DROP VIEW IF EXISTS public.pir_access_view CASCADE;
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON public.pir_requests;
DROP TRIGGER IF EXISTS validate_pir_status_transition_insert_trigger ON public.pir_requests;
DROP TRIGGER IF EXISTS validate_pir_status_transition_update_trigger ON public.pir_requests;
DROP FUNCTION IF EXISTS public.validate_pir_status_transition() CASCADE;

-- Create a temporary table with the same structure but text type for status
CREATE TEMPORARY TABLE temp_pir_requests AS 
SELECT 
    id,
    product_id,
    customer_id,
    supplier_company_id,
    title,
    description,
    status::text as status,
    due_date,
    created_at,
    updated_at,
    suggested_product_name
FROM public.pir_requests;

-- Drop the existing enum type
DROP TYPE IF EXISTS public.pir_status CASCADE;

-- Create the enum type with all values
CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'sent',
    'in_progress',
    'submitted',
    'reviewed',
    'rejected',
    'resubmitted',
    'canceled',
    'in_review',
    'flagged',
    'approved'
);

-- Drop and recreate the original table with the new enum type
DROP TABLE public.pir_requests CASCADE;

CREATE TABLE public.pir_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id),
    customer_id uuid NOT NULL REFERENCES public.companies(id),
    supplier_company_id uuid NOT NULL REFERENCES public.companies(id),
    title text NOT NULL,
    description text,
    status public.pir_status NOT NULL DEFAULT 'draft',
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    suggested_product_name text
);

-- Copy data back with type casting
INSERT INTO public.pir_requests (
    id,
    product_id,
    customer_id,
    supplier_company_id,
    title,
    description,
    status,
    due_date,
    created_at,
    updated_at,
    suggested_product_name
)
SELECT 
    id,
    product_id,
    customer_id,
    supplier_company_id,
    title,
    description,
    status::public.pir_status,
    due_date,
    created_at,
    updated_at,
    suggested_product_name
FROM temp_pir_requests;

-- Drop the temporary table
DROP TABLE temp_pir_requests;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS trigger AS $$
BEGIN
    -- Add your status transition validation logic here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER validate_pir_status_transition_insert_trigger
    BEFORE INSERT ON public.pir_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pir_status_transition();

CREATE TRIGGER validate_pir_status_transition_update_trigger
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

-- Verify the enum values again
SELECT e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'pir_status' AND n.nspname = 'public'; 