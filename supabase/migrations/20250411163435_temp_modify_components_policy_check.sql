-- Temporarily modify the SELECT policy on pir_response_components for debugging
-- Replace the specific company check with a general authenticated user check

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create a temporary, broader SELECT policy
CREATE POLICY "TEMP - Allow authenticated to read components"
ON public.pir_response_components
FOR SELECT
USING (
  auth.role() = 'authenticated' -- Allow any logged-in user (temporary)
);

-- Note: Remember to revert this policy later!
-- DROP POLICY IF EXISTS "TEMP - Allow authenticated to read components" ON public.pir_response_components;
-- Recreate original policy:
-- CREATE POLICY "Allow customer members to read components"
-- ON public.pir_response_components
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM pir_responses pr
--     JOIN pir_requests pir ON pr.pir_id = pir.id
--     WHERE pr.id = pir_response_components.pir_response_id
--     AND is_company_member_or_admin(pir.customer_id)
--   )
-- );