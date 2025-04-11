-- Revert the temporary modification to the SELECT policy on pir_response_components

-- Drop the temporary policy
DROP POLICY IF EXISTS "TEMP - Allow authenticated to read components" ON public.pir_response_components;

-- Recreate the original policy (from migration 20250411155042)
-- Drop existing policy first (in case it somehow still exists)
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create the original SELECT policy
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