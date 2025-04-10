-- Add INSERT policy for response_flags
CREATE POLICY "Users can insert flags on responses they can access"
ON public.response_flags
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.pir_responses pr
    JOIN public.pir_requests pir ON pir.id = pr.pir_id -- Corrected table name
    JOIN public.company_users cu ON cu.user_id = auth.uid()
    WHERE pr.id = response_flags.response_id -- Check against the row being inserted
      AND (
        cu.company_id = pir.customer_id OR
        cu.company_id = pir.supplier_company_id OR
        (pir.product_id IS NOT NULL AND cu.company_id = (
          SELECT p.supplier_id
          FROM public.products p
          WHERE p.id = pir.product_id -- Corrected table name reference
        ))
      )
  )
);