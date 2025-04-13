-- Add RLS policy to allow customers to update PIRs they own
-- This is necessary for them to change status to 'reviewed' or 'rejected'

-- Rule: Use conditional checks before creating RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Customers can update PIRs they own' AND tablename = 'pir_requests'
  ) THEN
    CREATE POLICY "Customers can update PIRs they own"
    ON public.pir_requests
    FOR UPDATE
    USING ( -- User must be member of the customer company
      EXISTS (
        SELECT 1
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id
      )
    )
    WITH CHECK ( -- Row must still belong to the customer company
      EXISTS (
        SELECT 1
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id
      )
    );
  END IF;
END $$;