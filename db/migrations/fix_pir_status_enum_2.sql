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