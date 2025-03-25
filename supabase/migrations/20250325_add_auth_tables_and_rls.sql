-- Create profiles table to link with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create company users association table
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',  -- 'admin', 'user', 'owner'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Company Users: Users can see companies they're associated with
CREATE POLICY "Users can view their company associations"
  ON public.company_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Companies: Users can see companies they're associated with via company_users
CREATE POLICY "Users can view their companies"
  ON public.companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- Product Sheets: Users can see sheets for companies they're associated with
CREATE POLICY "Users can view product sheets for their companies"
  ON public.product_sheets
  FOR SELECT
  USING (
    supplier_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR
    requested_by_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- Answers: Users can see answers for product sheets they have access to
CREATE POLICY "Users can view answers for their product sheets"
  ON public.answers
  FOR SELECT
  USING (
    product_sheet_id IN (
      SELECT id FROM public.product_sheets
      WHERE supplier_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
      OR requested_by_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  );

-- Add DB functions for checking permissions

-- Function to check if a user belongs to a specific company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE user_id = auth.uid() AND company_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Implementation will depend on our permission model
  -- For now, a simple check for role-based permissions
  IF permission = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    );
  ELSIF permission = 'owner' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.company_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    );
  ELSE
    -- All users have basic permissions
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_users_updated_at
BEFORE UPDATE ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create auth triggers for managing user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for creating profile on user creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 