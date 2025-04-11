-- Migration to create tables for storing structured component/material responses

-- Table to store the main component entries for a specific PIR response
CREATE TABLE public.pir_response_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pir_response_id uuid NOT NULL REFERENCES public.pir_responses(id) ON DELETE CASCADE,
    component_name text,
    "position" text, -- Using quotes as position might be a reserved word
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for frequent lookups
CREATE INDEX idx_pir_response_components_response_id ON public.pir_response_components(pir_response_id);

-- Enable RLS
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed based on your access patterns)
-- Allow users to see components linked to responses they can access (assuming a function `can_user_read_pir_response(response_id uuid)`)
-- CREATE POLICY "Allow read access based on parent response" ON public.pir_response_components FOR SELECT USING (can_user_read_pir_response(pir_response_id));
-- Allow users to insert components if they can update the parent response (assuming `can_user_update_pir_response(response_id uuid)`)
-- CREATE POLICY "Allow insert access based on parent response" ON public.pir_response_components FOR INSERT WITH CHECK (can_user_update_pir_response(pir_response_id));
-- Allow users to update/delete components if they can update the parent response
-- CREATE POLICY "Allow update access based on parent response" ON public.pir_response_components FOR UPDATE USING (can_user_update_pir_response(pir_response_id));
-- CREATE POLICY "Allow delete access based on parent response" ON public.pir_response_components FOR DELETE USING (can_user_update_pir_response(pir_response_id));
-- NOTE: RLS policies above are commented out as the helper functions likely don't exist yet. They need proper implementation.


-- Table to store material details linked to a specific component entry
CREATE TABLE public.pir_response_component_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id uuid NOT NULL REFERENCES public.pir_response_components(id) ON DELETE CASCADE,
    material_name text,
    percentage numeric,
    recyclable text,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for frequent lookups
CREATE INDEX idx_pir_response_component_materials_component_id ON public.pir_response_component_materials(component_id);

-- Enable RLS
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed)
-- Allow users to see materials linked to components they can access (requires joining to components and checking parent response access)
-- CREATE POLICY "Allow read access based on parent component" ON public.pir_response_component_materials FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_read_pir_response(c.pir_response_id)
--   ));
-- Allow users to insert materials if they can update the parent component/response
-- CREATE POLICY "Allow insert access based on parent component" ON public.pir_response_component_materials FOR INSERT
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- Allow users to update/delete materials if they can update the parent component/response
-- CREATE POLICY "Allow update access based on parent component" ON public.pir_response_component_materials FOR UPDATE
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- CREATE POLICY "Allow delete access based on parent component" ON public.pir_response_component_materials FOR DELETE
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- NOTE: RLS policies above are commented out.


-- Optional: Trigger to update the 'updated_at' timestamp on modification
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pir_response_components_updated_at
BEFORE UPDATE ON public.pir_response_components
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pir_response_component_materials_updated_at
BEFORE UPDATE ON public.pir_response_component_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant usage on the new tables to authenticated users (adjust role as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pir_response_components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pir_response_component_materials TO authenticated;

-- Grant usage on sequences if any were implicitly created (though default uuid doesn't use sequences)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;