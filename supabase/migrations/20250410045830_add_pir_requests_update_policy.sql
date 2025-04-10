CREATE POLICY "Suppliers can update PIRs assigned to them"
ON public.pir_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = pir_requests.supplier_company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = pir_requests.supplier_company_id
  )
  -- We could add more specific checks here later if needed,
  -- e.g., restricting which statuses can be set by suppliers.
);