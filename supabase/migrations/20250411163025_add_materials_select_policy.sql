-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create the SELECT policy for materials
CREATE POLICY "Allow customer members to read materials"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_response_components prc
    JOIN pir_responses pr ON prc.pir_response_id = pr.id
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE prc.id = pir_response_component_materials.component_id
    AND is_company_member_or_admin(pir.customer_id) -- Check if user is member of the customer company
  )
);