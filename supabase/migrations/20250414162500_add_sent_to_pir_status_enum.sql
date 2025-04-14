-- Migration: Add 'sent' value to pir_status enum
-- Description: This migration adds the 'sent' value to the pir_status enum if it doesn't already exist.

-- Check if 'sent' is already in the enum
DO $$
DECLARE
    enum_values text[];
    has_sent boolean;
BEGIN
    -- Get the current enum values
    SELECT array_agg(e.enumlabel) INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'pir_status';
    
    -- Check if 'sent' is already in the enum
    SELECT 'sent' = ANY(enum_values) INTO has_sent;
    
    -- If 'sent' is not in the enum, add it
    IF NOT has_sent THEN
        -- Add 'sent' value to the enum
        ALTER TYPE pir_status ADD VALUE 'sent';
        RAISE NOTICE 'Added ''sent'' value to pir_status enum.';
    ELSE
        RAISE NOTICE '''sent'' value already exists in pir_status enum.';
    END IF;
END $$;