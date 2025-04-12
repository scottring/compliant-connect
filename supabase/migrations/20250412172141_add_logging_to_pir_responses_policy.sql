CREATE OR REPLACE FUNCTION public.check_supplier_response_access_and_log(response_id uuid)
RETURNS boolean AS $$
DECLARE
  supplier_company_id uuid;
  access_granted boolean;
BEGIN
  -- Get the supplier_company_id from pir_requests based on the response_id
  SELECT pir.supplier_company_id INTO supplier_company_id
  FROM pir_requests pir
  JOIN pir_responses resp ON pir.id = resp.pir_request_id
  WHERE resp.id = response_id;

  -- Check if the current user is linked to the supplier company
  access_granted := EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.company_id = supplier_company_id
    AND cu.user_id = auth.uid()
  );

  -- Log the details
  RAISE NOTICE 'Response ID: %, User ID: %, Supplier Company ID: %, Access Granted: %', response_id, auth.uid(), supplier_company_id, access_granted;

  -- Return the access status
  RETURN access_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses" ON public.pir_responses
FOR ALL
USING (public.check_supplier_response_access_and_log(id))
WITH CHECK (public.check_supplier_response_access_and_log(id));