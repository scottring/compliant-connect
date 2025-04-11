-- Re-enable RLS on pir_response_components
-- The correct SELECT policy was already added in migration 20250411155042
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;