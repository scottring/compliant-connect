-- Drop existing tag policies
DROP POLICY IF EXISTS "Everyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Admin users can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can delete own tags" ON public.tags;

-- Create new tag policies
CREATE POLICY "Everyone can view tags"
    ON public.tags
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create tags"
    ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update own tags"
    ON public.tags
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete own tags"
    ON public.tags
    FOR DELETE
    TO authenticated
    USING (true); 