-- supabase/migrations/20250411105113_create_pir_response_comments_table.sql

-- Create the pir_response_comments table
CREATE TABLE public.pir_response_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    response_id uuid NOT NULL REFERENCES public.pir_responses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_pir_response_comments_response_id ON public.pir_response_comments(response_id);
CREATE INDEX idx_pir_response_comments_user_id ON public.pir_response_comments(user_id);

-- Enable Row Level Security
ALTER TABLE public.pir_response_comments ENABLE ROW LEVEL SECURITY;

-- Grant usage permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.pir_response_comments TO authenticated;

-- RLS Policy: Allow authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments"
ON public.pir_response_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Allow users associated with the PIR (customer/supplier) to view comments
-- This requires joining through pir_responses and pir_requests to check company associations
CREATE POLICY "Allow associated users to view comments"
ON public.pir_response_comments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pir_responses pr
        JOIN public.pir_requests pir ON pr.pir_id = pir.id
        JOIN public.company_users cu_customer ON pir.customer_id = cu_customer.company_id
        JOIN public.company_users cu_supplier ON pir.supplier_company_id = cu_supplier.company_id
        WHERE pr.id = pir_response_comments.response_id
        AND (
            cu_customer.user_id = auth.uid() OR cu_supplier.user_id = auth.uid()
        )
    )
);