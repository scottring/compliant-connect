-- Temporarily simplify the SELECT policy on pir_response_component_materials for debugging

-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create a temporary, simpler SELECT policy
CREATE POLICY "TEMP - Allow read based on parent component access"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_response_components prc
    WHERE prc.id = pir_response_component_materials.component_id
    -- Implicitly relies on the RLS policy of pir_response_components allowing SELECT on prc.id
  )
);

-- Note: Remember this needs to be reverted later!
-- Original policy was defined in 20250411163025_add_materials_select_policy.sql