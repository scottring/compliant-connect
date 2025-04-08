-- Add the created_by column to the questions table
ALTER TABLE public.questions
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Optional: Add an RLS policy check if needed, assuming questions should only be manageable by the creator or specific roles
-- Example (adjust policy as needed):
-- ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own questions" ON public.questions
-- FOR ALL USING (auth.uid() = created_by);