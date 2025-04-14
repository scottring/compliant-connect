-- Migration: Standardize pir_status enum values
-- Description: This migration standardizes the pir_status enum values to match the development environment.

-- Step 1: Create a temporary table to store the current status values
CREATE TEMP TABLE temp_pir_status AS SELECT id, status FROM pir_requests;

-- Step 2: Create a new enum type with all possible values (both canonical and non-canonical)
CREATE TYPE pir_status_all AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'in_review', 'flagged', 'approved', 'rejected', 'resubmitted', 'canceled', 'reviewed'
);

-- Step 3: Create a new enum type with only the canonical values
CREATE TYPE pir_status_canonical AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
);

-- Step 4: Alter the table to use text type temporarily
ALTER TABLE pir_requests ALTER COLUMN status TYPE TEXT;

-- Step 5: Map non-canonical values to canonical ones
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'in_review';
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'approved';
UPDATE pir_requests SET status = 'rejected' WHERE status = 'flagged';

-- Step 6: Update the table to use the canonical enum type
ALTER TABLE pir_requests ALTER COLUMN status TYPE pir_status_canonical USING status::pir_status_canonical;

-- Step 7: Drop the temporary enum types
DROP TYPE pir_status_all;
DROP TYPE pir_status CASCADE;

-- Step 8: Rename the canonical enum type to the original name
ALTER TYPE pir_status_canonical RENAME TO pir_status;

-- Step 9: Update the constraint to match the new enum values
ALTER TABLE pir_requests DROP CONSTRAINT IF EXISTS pir_requests_status_check;
ALTER TABLE pir_requests ADD CONSTRAINT pir_requests_status_check
  CHECK (status::text = ANY (ARRAY['draft'::text, 'sent'::text, 'in_progress'::text, 'submitted'::text, 'reviewed'::text, 'rejected'::text, 'resubmitted'::text, 'canceled'::text]));

-- Step 10: Log the standardization
DO $$
BEGIN
  RAISE NOTICE 'pir_status enum values have been standardized to match the development environment.';
END $$;