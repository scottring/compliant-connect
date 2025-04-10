-- Drop existing policies on response_flags
DROP POLICY IF EXISTS "Users can insert flags on responses they can access" ON public.response_flags;
DROP POLICY IF EXISTS "Allow authenticated full access on response_flags" ON public.response_flags;

-- Create new policies for response_flags
CREATE POLICY "Users can view flags on responses they can access"
ON public.response_flags
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.pir_responses pr
        JOIN public.pir_requests pir ON pir.id = pr.pir_id
        JOIN public.company_users cu ON cu.user_id = auth.uid()
        WHERE pr.id = response_flags.response_id
        AND (
            cu.company_id = pir.customer_id
            OR cu.company_id = pir.supplier_company_id
            OR (
                pir.product_id IS NOT NULL 
                AND cu.company_id = (
                    SELECT supplier_id
                    FROM public.products
                    WHERE id = pir.product_id
                )
            )
        )
    )
);

-- Allow customers to create flags on responses they can access
CREATE POLICY "Customers can create flags on responses"
ON public.response_flags
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.pir_responses pr
        JOIN public.pir_requests pir ON pir.id = pr.pir_id
        JOIN public.company_users cu ON cu.user_id = auth.uid()
        WHERE pr.id = response_flags.response_id
        AND cu.company_id = pir.customer_id
    )
    AND auth.uid() = created_by
);

-- Allow users to update flags they created
CREATE POLICY "Users can update their own flags"
ON public.response_flags
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to delete flags they created
CREATE POLICY "Users can delete their own flags"
ON public.response_flags
FOR DELETE
USING (created_by = auth.uid()); 