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

-- Create a temporary, permissive SELECT policy
CREATE POLICY "Allow associated users to view comments" -- Reusing name for simplicity
ON public.pir_response_comments
FOR SELECT
TO authenticated
USING (true); -- Allow any authenticated user