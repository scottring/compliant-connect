-- Enable RLS (just in case, though the error implies it's already enabled)
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert links between questions and tags
CREATE POLICY "Allow authenticated insert for question_tags"
ON public.question_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant usage on the table to authenticated role (might be missing)
GRANT INSERT ON TABLE public.question_tags TO authenticated;