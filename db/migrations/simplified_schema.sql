-- SIMPLIFIED SCHEMA WITH MINIMAL RLS COMPLEXITY
-- This version focuses on getting a working system quickly with fewer RLS constraints

-- =============================================
-- PART 1: Helper Functions 
-- =============================================

-- Create helper function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Simple auth helper that won't cause circular dependencies
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PART 2: Create Custom Types
-- =============================================

-- Company role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_role') THEN
        CREATE TYPE company_role AS ENUM ('customer', 'supplier', 'both');
    END IF;
END $$;

-- User role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'owner');
    END IF;
END $$;

-- =============================================
-- PART 3: Core Tables With Minimal RLS
-- =============================================

-- Create profiles table with relaxed constraints
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role company_role NOT NULL DEFAULT 'customer',
  contact_email TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create company_users association table
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

-- =============================================
-- PART 4: Question Bank Tables
-- =============================================

-- Create question_categories table
CREATE TABLE IF NOT EXISTS question_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES question_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES question_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  validation_rules JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table for questions
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for question-tag relationship
CREATE TABLE IF NOT EXISTS question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, tag_id)
);

-- =============================================
-- PART 5: Create Simple Indexes
-- =============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- Question bank indexes
CREATE INDEX IF NOT EXISTS idx_question_categories_parent_id ON question_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);

-- =============================================
-- PART 6: Create Triggers
-- =============================================

-- Core table triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_users_updated_at ON company_users;
CREATE TRIGGER update_company_users_updated_at
    BEFORE UPDATE ON company_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Question bank triggers
DROP TRIGGER IF EXISTS update_question_categories_updated_at ON question_categories;
CREATE TRIGGER update_question_categories_updated_at
    BEFORE UPDATE ON question_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PART 7: Minimal RLS Policies
-- =============================================

-- Enable RLS but with very permissive policies for development
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "anyone_can_view_profiles" ON profiles;
    DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;
    DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
    
    -- Companies
    DROP POLICY IF EXISTS "anyone_can_view_companies" ON companies;
    DROP POLICY IF EXISTS "authenticated_can_insert_companies" ON companies;
    DROP POLICY IF EXISTS "authenticated_can_update_companies" ON companies;
    
    -- Company Users
    DROP POLICY IF EXISTS "anyone_can_view_company_users" ON company_users;
    DROP POLICY IF EXISTS "authenticated_can_manage_company_users" ON company_users;
    
    -- Question Categories
    DROP POLICY IF EXISTS "anyone_can_view_question_categories" ON question_categories;
    DROP POLICY IF EXISTS "authenticated_can_manage_question_categories" ON question_categories;
    
    -- Questions
    DROP POLICY IF EXISTS "anyone_can_view_questions" ON questions;
    DROP POLICY IF EXISTS "authenticated_can_manage_questions" ON questions;
    
    -- Tags
    DROP POLICY IF EXISTS "anyone_can_view_tags" ON tags;
    DROP POLICY IF EXISTS "authenticated_can_manage_tags" ON tags;
    
    -- Question Tags
    DROP POLICY IF EXISTS "anyone_can_view_question_tags" ON question_tags;
    DROP POLICY IF EXISTS "authenticated_can_manage_question_tags" ON question_tags;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create simplified RLS policies for development

-- Profiles policies
CREATE POLICY "anyone_can_view_profiles" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "users_can_insert_own_profile" 
    ON profiles FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own_profile" 
    ON profiles FOR UPDATE 
    USING (id = auth.uid());

-- Companies policies (very permissive for development)
CREATE POLICY "anyone_can_view_companies" 
    ON companies FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_insert_companies" 
    ON companies FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "authenticated_can_update_companies" 
    ON companies FOR UPDATE 
    TO authenticated 
    USING (true);

-- Company Users policies (permissive for development)
CREATE POLICY "anyone_can_view_company_users" 
    ON company_users FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_manage_company_users" 
    ON company_users FOR ALL 
    TO authenticated 
    USING (true);

-- Question Categories policies (permissive for development)
CREATE POLICY "anyone_can_view_question_categories" 
    ON question_categories FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_manage_question_categories" 
    ON question_categories FOR ALL 
    TO authenticated 
    USING (true);

-- Questions policies (permissive for development)
CREATE POLICY "anyone_can_view_questions" 
    ON questions FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_manage_questions" 
    ON questions FOR ALL 
    TO authenticated 
    USING (true);

-- Tags policies (permissive for development)
CREATE POLICY "anyone_can_view_tags" 
    ON tags FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_manage_tags" 
    ON tags FOR ALL 
    TO authenticated 
    USING (true);

-- Question Tags policies (permissive for development)
CREATE POLICY "anyone_can_view_question_tags" 
    ON question_tags FOR SELECT 
    USING (true);

CREATE POLICY "authenticated_can_manage_question_tags" 
    ON question_tags FOR ALL 
    TO authenticated 
    USING (true);

-- =============================================
-- PART 8: Helpers for Emergency Recovery
-- =============================================

-- Create an admin company for a user
CREATE OR REPLACE FUNCTION create_admin_company(user_id UUID)
RETURNS json AS $$
DECLARE
    company_id UUID;
    result json;
BEGIN
    -- Create company
    INSERT INTO companies (name, created_by)
    VALUES ('Admin Company', user_id)
    RETURNING id INTO company_id;
    
    -- Associate user as admin
    INSERT INTO company_users (user_id, company_id, role)
    VALUES (user_id, company_id, 'admin');
    
    RETURN json_build_object(
        'status', 'success',
        'company_id', company_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Emergency function to bypass RLS completely
CREATE OR REPLACE FUNCTION emergency_run_sql(sql_text TEXT)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    EXECUTE sql_text;
    RETURN json_build_object(
        'status', 'success',
        'sql', sql_text
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM,
        'sql', sql_text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 