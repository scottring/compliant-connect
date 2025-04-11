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