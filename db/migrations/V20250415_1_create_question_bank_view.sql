-- Migration: create_question_bank_view
-- Description: Creates or updates the question bank view with numbered questions
-- Created: 2025-04-15

-- Verify we're in a transaction
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        AND pid = pg_backend_pid()
    ) THEN
        RAISE EXCEPTION 'Migration must run within a transaction';
    END IF;
END;
$$;

-- First, check if the base tables exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'questions'
    ) THEN
        CREATE TABLE public.questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question_text TEXT NOT NULL,
            category TEXT,
            subcategory TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Add RLS policies
        ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Enable read access for authenticated users" ON public.questions
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END;
$$;

-- Create or replace the view
CREATE OR REPLACE VIEW public.v_question_bank_numbered AS
WITH numbered_questions AS (
    SELECT 
        id,
        question_text,
        category,
        subcategory,
        created_at,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY category, subcategory 
            ORDER BY created_at
        ) as question_number
    FROM public.questions
)
SELECT 
    id,
    question_text,
    category,
    subcategory,
    created_at,
    updated_at,
    question_number,
    category || '-' || subcategory || '-' || LPAD(question_number::text, 3, '0') as question_code
FROM numbered_questions;

-- Grant permissions on the view
GRANT SELECT ON public.v_question_bank_numbered TO authenticated;
GRANT SELECT ON public.v_question_bank_numbered TO service_role;

-- Verify the view was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_question_bank_numbered'
    ) THEN
        RAISE EXCEPTION 'View creation failed: v_question_bank_numbered not found';
    END IF;
END;
$$;

-- Update schema version
INSERT INTO schema_version (version, description, applied_at)
VALUES ('20250415_1', 'Create question bank view', NOW()); 