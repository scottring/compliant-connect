-- Add RLS policy for company creation
CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO public
WITH CHECK (true);

-- Add RLS policy for company_users creation
CREATE POLICY "Users can create company associations"
ON public.company_users
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy for company users to view their own associations
CREATE POLICY "Users can view their own company associations"
ON public.company_users
FOR SELECT
TO public
USING (user_id = auth.uid());

-- Add RLS policy for company users to view their companies
CREATE POLICY "Users can view their own companies"
ON public.companies
FOR SELECT
TO public
USING (
    id IN (
        SELECT company_id 
        FROM public.company_users 
        WHERE user_id = auth.uid()
    )
); 