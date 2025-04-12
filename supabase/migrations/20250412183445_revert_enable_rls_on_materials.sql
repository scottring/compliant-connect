-- Revert temporary RLS enablement on pir_response_component_materials
DROP POLICY IF EXISTS "Temp allow all inserts" ON public.pir_response_component_materials;

ALTER TABLE public.pir_response_component_materials DISABLE ROW LEVEL SECURITY;