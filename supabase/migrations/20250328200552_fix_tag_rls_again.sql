-- Drop all existing tag policies to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Admin users can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can delete own tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated can manage tags" ON public.tags;

-- Enable RLS on tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for tags
CREATE POLICY "Anyone can view tags"
    ON public.tags
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated can manage tags"
    ON public.tags
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role; 