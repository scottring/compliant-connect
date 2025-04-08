-- Add LIST_TABLE to the question_type enum
-- Note: Adding enum values is transactional within Postgres, but requires care.
-- Ensure this doesn't conflict with concurrent transactions if applied manually.
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'LIST_TABLE';

-- Add table_config column to questions table to store table structure
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS table_config JSONB;

-- Optional: Add a check constraint to ensure table_config is only populated for LIST_TABLE type
-- This helps maintain data integrity.
-- Consider adding this later if needed, as modifying constraints can be complex.
-- ALTER TABLE public.questions
-- ADD CONSTRAINT check_table_config_for_list_table
-- CHECK ( (type = 'LIST_TABLE' AND table_config IS NOT NULL) OR (type != 'LIST_TABLE' AND table_config IS NULL) );
