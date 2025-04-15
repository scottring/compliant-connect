-- Create a function to verify auth.uid() works correctly
CREATE OR REPLACE FUNCTION check_auth_uid()
RETURNS text AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the current user ID
    user_id := auth.uid();
    
    -- Return user ID as text for validation
    RETURN user_id::text;
EXCEPTION WHEN OTHERS THEN
    -- Return error details if something goes wrong
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get RLS check info
CREATE OR REPLACE FUNCTION debug_rls(schema_name text, table_name text)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'table', schema_name || '.' || table_name,
        'policies', (
            SELECT json_agg(json_build_object(
                'name', p.policyname,
                'command', p.cmd,
                'roles', p.roles,
                'using_expr', p.qual,
                'with_check_expr', p.with_check
            ))
            FROM pg_policies p
            WHERE p.schemaname = schema_name AND p.tablename = table_name
        ),
        'has_rls', (
            SELECT r.relrowsecurity
            FROM pg_class r
            JOIN pg_namespace n ON r.relnamespace = n.oid
            WHERE n.nspname = schema_name AND r.relname = table_name
        ),
        'rls_enabled', (
            SELECT r.relforcerowsecurity
            FROM pg_class r
            JOIN pg_namespace n ON r.relnamespace = n.oid
            WHERE n.nspname = schema_name AND r.relname = table_name
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a bypass function to access company_users without RLS
CREATE OR REPLACE FUNCTION get_user_company_roles(user_id UUID)
RETURNS json AS $$
DECLARE
    roles json;
BEGIN
    SELECT json_agg(json_build_object(
        'company_id', cu.company_id, 
        'role', cu.role,
        'company_name', c.name
    ))
    INTO roles
    FROM company_users cu
    JOIN companies c ON cu.company_id = c.id
    WHERE cu.user_id = user_id;
    
    RETURN roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Emergency function to create a test admin company association
CREATE OR REPLACE FUNCTION emergency_create_admin(user_id UUID)
RETURNS json AS $$
DECLARE
    company_id UUID;
    company_rec record;
    association_rec record;
    result json;
BEGIN
    -- First check if user already has associations
    SELECT COUNT(*) > 0 INTO strict result
    FROM company_users 
    WHERE company_users.user_id = user_id;
    
    IF result THEN
        RETURN json_build_object('status', 'exists', 'message', 'User already has company associations');
    END IF;
    
    -- Create a new company
    INSERT INTO companies (
        name, 
        role, 
        contact_name, 
        contact_email
    ) VALUES (
        'Emergency Test Company',
        'customer',
        'Test User',
        'emergency@test.com'
    ) RETURNING id INTO company_id;
    
    -- Create admin association
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
    
    -- Verify creation
    SELECT * INTO strict company_rec 
    FROM companies 
    WHERE id = company_id;
    
    SELECT * INTO strict association_rec 
    FROM company_users 
    WHERE user_id = user_id AND company_id = company_id;
    
    RETURN json_build_object(
        'status', 'success',
        'company', row_to_json(company_rec),
        'association', row_to_json(association_rec)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an emergency function to insert a question category
CREATE OR REPLACE FUNCTION emergency_create_category(name text, created_by UUID)
RETURNS json AS $$
DECLARE
    category_rec record;
    result json;
BEGIN
    -- Insert the category
    INSERT INTO question_categories (
        name,
        created_by
    ) VALUES (
        name,
        created_by
    ) RETURNING * INTO category_rec;
    
    RETURN json_build_object(
        'status', 'success',
        'category', row_to_json(category_rec)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 