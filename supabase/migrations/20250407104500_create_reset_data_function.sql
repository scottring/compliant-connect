-- Function to reset application data, bypassing RLS
-- IMPORTANT: This function performs irreversible data deletion. Use with caution.
CREATE OR REPLACE FUNCTION reset_application_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to run with the privileges of the user who defined it (typically postgres role), bypassing RLS
AS $$
BEGIN
    -- Delete data in order respecting foreign key constraints
    -- Delete comments and flags first as they reference answers/questions
    DELETE FROM public.comments;
    DELETE FROM public.flags;

    -- Delete junction tables
    DELETE FROM public.question_tags;
    DELETE FROM public.product_sheet_tags;

    -- Delete answers before product sheets/questions
    DELETE FROM public.answers;

    -- Delete questions before sections
    DELETE FROM public.questions;

    -- Delete subsections before sections
    DELETE FROM public.subsections;

    -- Delete main data tables
    DELETE FROM public.product_sheets;
    DELETE FROM public.sections;
    DELETE FROM public.tags;

    -- IMPORTANT: We are intentionally NOT deleting from:
    -- public.companies: To preserve company structures
    -- public.company_users: To preserve user roles and access within companies
    -- auth.users: To preserve user accounts

    -- Add any other tables that need clearing here, respecting dependencies.

END;
$$;

-- Grant execute permission to the authenticated role
-- This allows logged-in users to call the function via RPC
GRANT EXECUTE ON FUNCTION public.reset_application_data() TO authenticated;

-- Optional: If you have a specific admin role, grant execute only to that role
-- REVOKE EXECUTE ON FUNCTION public.reset_application_data() FROM authenticated;
-- GRANT EXECUTE ON FUNCTION public.reset_application_data() TO admin_role; -- Replace admin_role with your actual role name if applicable
