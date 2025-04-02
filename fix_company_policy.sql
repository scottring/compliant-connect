-- Drop existing policies on companies table
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Company owners and admins can update their companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;

-- Create a simpler policy for viewing companies
CREATE POLICY "view_associated_companies"
ON companies
FOR SELECT
USING (
    id IN (
        SELECT company_id
        FROM company_users
        WHERE user_id = auth_uid()
    )
);

-- Create a simple policy to allow creating companies
CREATE POLICY "allow_company_creation"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a policy for updates by admins
CREATE POLICY "admins_update_companies"
ON companies
FOR UPDATE
USING (
    id IN (
        SELECT company_id
        FROM company_users
        WHERE user_id = auth_uid()
        AND role IN ('owner', 'admin')
    )
);

-- Create a direct function to create companies without RLS
CREATE OR REPLACE FUNCTION direct_create_company(
    name_param TEXT,
    role_param TEXT,
    contact_name_param TEXT,
    contact_email_param TEXT
) RETURNS UUID AS $$
DECLARE
    new_company_id UUID;
BEGIN
    INSERT INTO companies (
        name,
        role,
        contact_name,
        contact_email
    ) VALUES (
        name_param,
        role_param::company_role,
        contact_name_param,
        contact_email_param
    ) RETURNING id INTO new_company_id;
    
    RETURN new_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update emergency_create_admin to use direct_create_company
CREATE OR REPLACE FUNCTION emergency_create_admin(user_id UUID)
RETURNS json AS $$
DECLARE
    company_id UUID;
BEGIN
    -- First check if user already has associations
    IF EXISTS (SELECT 1 FROM company_users WHERE user_id = user_id) THEN
        RETURN '{"status": "exists", "message": "User already has company associations"}'::json;
    END IF;
    
    -- Create a company using the direct function
    company_id := direct_create_company(
        'Emergency Test Company ' || now()::text,
        'customer', 
        'Test User',
        'emergency@test.com'
    );
    
    -- Create admin association directly
    INSERT INTO company_users (
        user_id,
        company_id,
        role,
        is_primary
    ) VALUES (
        user_id,
        company_id,
        'admin',
        true
    );
    
    RETURN '{"status": "success", "message": "Admin association created", "company_id": "' || company_id || '"}'::json;
    
EXCEPTION WHEN OTHERS THEN
    RETURN '{"status": "error", "message": "' || SQLERRM || '"}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 