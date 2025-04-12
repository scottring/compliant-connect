-- Temporarily simplify the policy for debugging RLS issues
DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses"
ON public.pir_responses
FOR ALL
USING (true)
WITH CHECK (true);