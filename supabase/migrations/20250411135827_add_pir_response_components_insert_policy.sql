-- Function to check if the current user is a member or admin of a given company
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member') -- Adjust roles as needed
  );
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_company_member_or_admin(uuid) TO authenticated;

-- Add RLS policies for pir_response_components

-- Allow read if user is member of the associated customer or supplier company
CREATE POLICY "Allow read components based on parent request company"
ON public.pir_response_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow insert if user is member of the associated customer or supplier company
CREATE POLICY "Allow insert components based on parent request company"
ON public.pir_response_components
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow update if user is member of the associated customer or supplier company
CREATE POLICY "Allow update components based on parent request company"
ON public.pir_response_components
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow delete if user is member of the associated customer or supplier company
CREATE POLICY "Allow delete components based on parent request company"
ON public.pir_response_components
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);


-- Add RLS policies for pir_response_component_materials

-- Allow read if user is member of the associated customer or supplier company
CREATE POLICY "Allow read materials based on parent request company"
ON public.pir_response_component_materials
FOR SELECT
USING (
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

-- Allow insert if user is member of the associated customer or supplier company
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

-- Allow update if user is member of the associated customer or supplier company
CREATE POLICY "Allow update materials based on parent request company"
ON public.pir_response_component_materials
FOR UPDATE
USING (
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
)
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

-- Allow delete if user is member of the associated customer or supplier company
CREATE POLICY "Allow delete materials based on parent request company"
ON public.pir_response_component_materials
FOR DELETE
USING (
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