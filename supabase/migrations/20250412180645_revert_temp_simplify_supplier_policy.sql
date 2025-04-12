-- Restore original supplier policy on pir_responses
DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses"
ON public.pir_responses
FOR ALL
USING (EXISTS ( SELECT 1
       FROM pir_requests pir
         JOIN company_users cu ON cu.company_id = pir.supplier_company_id
      WHERE cu.user_id = auth.uid() AND pir.id = pir_responses.pir_id))
WITH CHECK (EXISTS ( SELECT 1
       FROM pir_requests pir
         JOIN company_users cu ON cu.company_id = pir.supplier_company_id
      WHERE cu.user_id = auth.uid() AND pir.id = pir_responses.pir_id));