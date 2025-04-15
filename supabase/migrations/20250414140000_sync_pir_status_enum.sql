-- This migration ensures that the pir_status enum has the same values in both projects

-- First, create a function to check if a value exists in an enum
CREATE OR REPLACE FUNCTION public.enum_value_exists(enum_type text, enum_value text) RETURNS boolean AS $$
DECLARE
    exists_val boolean;
BEGIN
    EXECUTE format('SELECT %L::text = ANY(enum_range(NULL::%I)::text[])', enum_value, enum_type) INTO exists_val;
    RETURN exists_val;
END;
$$ LANGUAGE plpgsql;

-- Add missing values to the pir_status enum
DO $$
BEGIN
    -- Add 'sent' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'sent') THEN
        ALTER TYPE public.pir_status ADD VALUE 'sent' AFTER 'draft';
    END IF;

    -- Add 'in_progress' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'in_progress') THEN
        ALTER TYPE public.pir_status ADD VALUE 'in_progress' AFTER 'sent';
    END IF;

    -- Add 'submitted' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'submitted') THEN
        ALTER TYPE public.pir_status ADD VALUE 'submitted' AFTER 'in_progress';
    END IF;

    -- Add 'reviewed' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'reviewed') THEN
        ALTER TYPE public.pir_status ADD VALUE 'reviewed' AFTER 'submitted';
    END IF;

    -- Add 'rejected' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'rejected') THEN
        ALTER TYPE public.pir_status ADD VALUE 'rejected' AFTER 'reviewed';
    END IF;

    -- Add 'resubmitted' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'resubmitted') THEN
        ALTER TYPE public.pir_status ADD VALUE 'resubmitted' AFTER 'rejected';
    END IF;

    -- Add 'canceled' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'canceled') THEN
        ALTER TYPE public.pir_status ADD VALUE 'canceled' AFTER 'resubmitted';
    END IF;

    -- Add 'in_review' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'in_review') THEN
        ALTER TYPE public.pir_status ADD VALUE 'in_review' AFTER 'in_progress';
    END IF;

    -- Add 'flagged' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'flagged') THEN
        ALTER TYPE public.pir_status ADD VALUE 'flagged' AFTER 'in_review';
    END IF;

    -- Add 'approved' if it doesn't exist
    IF NOT public.enum_value_exists('pir_status', 'approved') THEN
        ALTER TYPE public.pir_status ADD VALUE 'approved' AFTER 'reviewed';
    END IF;
END $$;

-- Drop the function as it's no longer needed
DROP FUNCTION public.enum_value_exists(text, text);