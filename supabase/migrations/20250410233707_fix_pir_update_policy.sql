-- Rename the policy for clarity
ALTER POLICY "Suppliers can update PIRs assigned to them" ON public.pir_requests
RENAME TO "Allow suppliers and customers to update assigned PIRs";

-- Update the USING expression to allow customers
ALTER POLICY "Allow suppliers and customers to update assigned PIRs" ON public.pir_requests
USING (
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.supplier_company_id
  )) OR
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id -- Corrected customer check
  ))
);

-- Update the WITH CHECK expression to allow customers
ALTER POLICY "Allow suppliers and customers to update assigned PIRs" ON public.pir_requests
WITH CHECK (
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.supplier_company_id
  )) OR
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id -- Corrected customer check
  ))
);