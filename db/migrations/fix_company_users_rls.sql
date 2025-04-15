-- First, drop all existing RLS policies for company_users
DROP POLICY IF EXISTS "Users can view company relationships they're part of" ON company_users;
DROP POLICY IF EXISTS "Company owners can manage company users" ON company_users;
DROP POLICY IF EXISTS "Users can view their company associations" ON company_users;
DROP POLICY IF EXISTS "Users can view their own company associations" ON company_users;
DROP POLICY IF EXISTS "Users can create company associations" ON company_users;

-- Create a function to break circular dependencies
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SECURITY DEFINER functions for policy checks
CREATE OR REPLACE FUNCTION is_admin_of_company(company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM company_users 
        WHERE user_id = auth_uid() 
        AND company_id = $1
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM company_users 
        WHERE user_id = auth_uid() 
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get table policies for debugging
CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
RETURNS json AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(policies))
        FROM (
            SELECT 
                p.policyname as policy_name,
                p.tablename as table_name,
                p.cmd as command,
                p.qual as using_expression,
                p.with_check as with_check_expression
            FROM pg_policies p
            WHERE p.tablename = $1
        ) policies
    );
END;
$$ LANGUAGE plpgsql;

-- Then create new policies without circular dependencies
-- Policy for SELECT
CREATE POLICY "Users can view company associations" 
ON company_users 
FOR SELECT 
USING (user_id = auth_uid());

-- Policy for INSERT
CREATE POLICY "Users can create their own associations" 
ON company_users 
FOR INSERT 
WITH CHECK (user_id = auth_uid());

-- Policy for company admins to manage all users in their company
CREATE POLICY "Company admins can manage users" 
ON company_users 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 
        FROM company_users
        WHERE user_id = auth_uid() 
        AND company_id = company_users.company_id
        AND role IN ('owner', 'admin')
    )
);

-- Update the question_categories policies
DROP POLICY IF EXISTS "Only admins can manage question categories" ON question_categories;
DROP POLICY IF EXISTS "Everyone can view question categories" ON question_categories;

CREATE POLICY "Everyone can view question categories"
ON question_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage question categories"
ON question_categories FOR ALL
USING (user_is_admin());

-- Update the questions policies
DROP POLICY IF EXISTS "Only admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Everyone can view questions" ON questions;

CREATE POLICY "Everyone can view questions"
ON questions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage questions"
ON questions FOR ALL
USING (user_is_admin()); 