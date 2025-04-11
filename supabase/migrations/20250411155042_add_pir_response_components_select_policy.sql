-- Enable RLS for the table if not already enabled (idempotent)
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (good practice for idempotency)
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create the SELECT policy
CREATE POLICY "Allow customer members to read components"
ON public.pir_response_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_responses pr
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE pr.id = pir_response_components.pir_response_id
    AND is_company_member_or_admin(pir.customer_id) -- Check if user is member of the customer company
  )
);