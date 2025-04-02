-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they have relationships with" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Dashboard can view all companies" ON public.companies;

-- Disable RLS on all tables
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users and service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;

-- Grant select on auth.users to authenticated users
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO service_role;

-- Insert test company
INSERT INTO public.companies (id, name, created_at, updated_at)
VALUES ('371c10cc-60e3-449d-ab01-58b355d67408', 'Test Company', NOW(), NOW())
ON CONFLICT (id) DO NOTHING; 