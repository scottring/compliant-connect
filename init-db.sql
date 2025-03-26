-- Create profiles table to store user profile information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own profile
CREATE POLICY "Users can view and edit their own profile"
ON public.profiles
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create companies table
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

-- Create company_users table for associating users with companies
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable Row Level Security on tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Create policies for companies table
CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can view their companies"
ON public.companies FOR SELECT TO authenticated
USING (
  id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company owners can update their companies"
ON public.companies FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Create policies for company_users table
CREATE POLICY "Users can create company associations"
ON public.company_users FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR TRUE);

CREATE POLICY "Users can view their company associations"
ON public.company_users FOR SELECT TO authenticated
USING (user_id = auth.uid() OR 
       company_id IN (
         SELECT company_id FROM public.company_users 
         WHERE user_id = auth.uid() AND role = 'owner'
       )
);

-- Create trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (new.id, 
          new.raw_user_meta_data->>'first_name', 
          new.raw_user_meta_data->>'last_name', 
          new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to check if a user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE user_id = $1 AND company_id = $2
  ) INTO belongs;
  
  RETURN belongs;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER; 