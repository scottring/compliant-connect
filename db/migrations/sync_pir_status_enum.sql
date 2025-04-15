-- This migration ensures that the pir_status enum has the same values in both projects

-- First, let's get the current enum values
DO $$
DECLARE
    current_values text[];
    new_value text;
BEGIN
    -- Get current enum values
    SELECT array_agg(e.enumlabel) INTO current_values
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'pir_status' AND n.nspname = 'public';

    -- Add new values one at a time, checking if they exist first
    FOR new_value IN 
        SELECT unnest(ARRAY['sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled', 'in_review', 'flagged', 'approved'])
    LOOP
        IF NOT (new_value = ANY(current_values)) THEN
            BEGIN
                EXECUTE format('ALTER TYPE public.pir_status ADD VALUE %L', new_value);
            EXCEPTION WHEN duplicate_object THEN
                -- Value already exists, skip
                NULL;
            END;
        END IF;
    END LOOP;
END $$; 