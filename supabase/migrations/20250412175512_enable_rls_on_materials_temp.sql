-- Temporarily enable RLS and allow all inserts for debugging
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Temp allow all inserts" ON public.pir_response_component_materials;

CREATE POLICY "Temp allow all inserts"
ON public.pir_response_component_materials
FOR INSERT
WITH CHECK (true);