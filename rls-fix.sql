-- Simplify the RLS policies to ensure they're permissive
-- First, make sure the tables exist
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start clean
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Company owners can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create company associations" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their company associations" ON public.company_users;

-- Create very permissive policies for development
-- For companies table
CREATE POLICY "Allow all operations for authenticated users on companies"
ON public.companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- For company_users table
CREATE POLICY "Allow all operations for authenticated users on company_users"
ON public.company_users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Check the database state
SELECT 'Table companies exists' AS check 
WHERE EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies');

SELECT 'Table company_users exists' AS check 
WHERE EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_users');

SELECT 'Policies for companies table exist' AS check, count(*) AS policy_count 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'companies';

SELECT 'Policies for company_users table exist' AS check, count(*) AS policy_count 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'company_users'; 