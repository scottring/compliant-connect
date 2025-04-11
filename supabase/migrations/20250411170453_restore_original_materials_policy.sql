-- Restore the original SELECT policy on pir_response_component_materials

-- Drop the temporary policy
DROP POLICY IF EXISTS "TEMP - Allow read based on parent component access" ON public.pir_response_component_materials;

-- Recreate the original policy (from migration 20250411163025)
-- Drop existing policy first (for idempotency, in case it somehow still exists)
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create the original SELECT policy for materials
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
    AND is_company_member_or_admin(pir.customer_id) -- Use the now-fixed function
  )
);