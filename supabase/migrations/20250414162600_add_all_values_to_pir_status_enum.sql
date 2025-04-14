-- Migration: Add all necessary values to pir_status enum
-- Description: This migration adds all necessary values to the pir_status enum if they don't already exist.

-- Function to add a value to an enum if it doesn't exist
CREATE OR REPLACE FUNCTION add_value_to_enum(p_enum_name text, p_value text)
RETURNS void AS $$
DECLARE
    enum_values text[];
    has_value boolean;
BEGIN
    -- Get the current enum values
    EXECUTE format('SELECT array_agg(e.enumlabel) FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = %L', p_enum_name)
    INTO enum_values;
    
    -- Check if the value is already in the enum
    SELECT p_value = ANY(enum_values) INTO has_value;
    
    -- If the value is not in the enum, add it
    IF NOT has_value THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', p_enum_name, p_value);
        RAISE NOTICE 'Added ''%'' value to % enum.', p_value, p_enum_name;
    ELSE
        RAISE NOTICE '''%'' value already exists in % enum.', p_value, p_enum_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add all necessary values to the pir_status enum
SELECT add_value_to_enum('pir_status', 'draft');
SELECT add_value_to_enum('pir_status', 'sent');
SELECT add_value_to_enum('pir_status', 'in_progress');
SELECT add_value_to_enum('pir_status', 'submitted');
SELECT add_value_to_enum('pir_status', 'reviewed');
SELECT add_value_to_enum('pir_status', 'rejected');
SELECT add_value_to_enum('pir_status', 'resubmitted');
SELECT add_value_to_enum('pir_status', 'canceled');

-- Drop the function when done
DROP FUNCTION add_value_to_enum(text, text);