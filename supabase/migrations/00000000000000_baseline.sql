-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.response_comments CASCADE;
DROP TABLE IF EXISTS public.response_flags CASCADE;
DROP TABLE IF EXISTS public.pir_responses CASCADE;
DROP TABLE IF EXISTS public.pir_tags CASCADE;
DROP TABLE IF EXISTS public.pir_requests CASCADE;
DROP TABLE IF EXISTS public.product_answer_history CASCADE;
DROP TABLE IF EXISTS public.product_answers CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.question_tags CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.subsections CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.company_relationships CASCADE;
DROP TABLE IF EXISTS public.company_users CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS public.relationship_status CASCADE;
DROP TYPE IF EXISTS public.pir_status CASCADE;
DROP TYPE IF EXISTS public.response_status CASCADE;
DROP TYPE IF EXISTS public.flag_status CASCADE;
DROP TYPE IF EXISTS public.question_type CASCADE;

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.company_relationships_view CASCADE;
DROP VIEW IF EXISTS public.product_access_view CASCADE;
DROP VIEW IF EXISTS public.pir_access_view CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE; 