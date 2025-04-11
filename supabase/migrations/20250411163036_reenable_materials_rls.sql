-- Re-enable RLS on pir_response_component_materials
-- The correct SELECT policy was added in the previous migration (20250411163025)
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;