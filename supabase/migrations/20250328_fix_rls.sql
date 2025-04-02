-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view company_users for their companies" ON public.company_users;
DROP POLICY IF EXISTS "Users can manage company_users for their companies" ON public.company_users;
DROP POLICY IF EXISTS "Users can view members of their company" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage users" ON public.company_users;

-- Create a simple policy that allows users to view their own associations
CREATE POLICY "users_view_own_associations"
ON public.company_users
FOR SELECT
USING (user_id = auth.uid());

-- Create a simple policy that allows users to create their own associations
CREATE POLICY "users_create_own_associations"
ON public.company_users
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create a simple policy that allows users to update their own associations
CREATE POLICY "users_update_own_associations"
ON public.company_users
FOR UPDATE
USING (user_id = auth.uid());

-- Create a simple policy that allows users to delete their own associations
CREATE POLICY "users_delete_own_associations"
ON public.company_users
FOR DELETE
USING (user_id = auth.uid());