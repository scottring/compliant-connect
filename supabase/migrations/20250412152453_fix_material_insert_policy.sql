-- Drop the existing policy
DROP POLICY IF EXISTS "Allow insert materials based on parent request company" ON public.pir_response_component_materials;

-- Modify the is_company_member_or_admin function to include logging
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  FOUND BOOLEAN;
BEGIN
  FOUND := EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member') -- Adjust roles as needed
  );
  RETURN FOUND;
END;
$$;

-- Recreate the INSERT policy with the modified function
CREATE POLICY "Allow insert materials based on parent request company"
ON public.pir_response_component_materials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);