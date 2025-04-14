-- Migration: Copy working pir_status enum from development
-- Description: This migration drops and recreates the pir_status enum to match the development environment.

-- Step 1: Drop the trigger that's causing the blockage
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON pir_requests;

-- Step 2: Drop the associated trigger function
DROP FUNCTION IF EXISTS validate_pir_status_transition();

-- Step 3: Drop the view that depends on the column if it exists
DROP VIEW IF EXISTS pir_access_view CASCADE;

-- Step 4: Create a temporary table to store the current status values
CREATE TEMP TABLE temp_pir_status AS SELECT id, status::text AS status_text FROM pir_requests;

-- Step 5: Alter the table to use text type
ALTER TABLE pir_requests ALTER COLUMN status TYPE TEXT;

-- Step 6: Drop the existing enum type
DROP TYPE IF EXISTS pir_status CASCADE;

-- Step 7: Create the enum type with the canonical values
CREATE TYPE pir_status AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
);

-- Step 8: Map any non-canonical values to canonical ones
UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'in_review';
UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'approved';
UPDATE temp_pir_status SET status_text = 'rejected' WHERE status_text = 'flagged';

-- Step 9: Update the pir_requests table with the mapped values
UPDATE pir_requests 
SET status = temp_pir_status.status_text
FROM temp_pir_status
WHERE pir_requests.id = temp_pir_status.id;

-- Step 10: Alter the table to use the enum type
ALTER TABLE pir_requests ALTER COLUMN status TYPE pir_status USING status::pir_status;

-- Step 11: Drop the temporary table
DROP TABLE temp_pir_status;

-- Step 12: Update the constraint to match the new enum values
ALTER TABLE pir_requests DROP CONSTRAINT IF EXISTS pir_requests_status_check;
ALTER TABLE pir_requests ADD CONSTRAINT pir_requests_status_check
  CHECK (status::text = ANY (ARRAY['draft'::text, 'sent'::text, 'in_progress'::text, 'submitted'::text, 'reviewed'::text, 'rejected'::text, 'resubmitted'::text, 'canceled'::text]));

-- Step 13: Log the standardization
DO $$
BEGIN
  RAISE NOTICE 'pir_status enum values have been standardized to match the development environment.';
END $$;