-- V1.1__fix_pir_status_enum.sql
DO $$
BEGIN
  -- Check if the enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pir_status') THEN
    -- Create a temporary table to store the current status values
    CREATE TEMP TABLE temp_pir_status AS SELECT id, status::text AS status_text FROM pir_requests;
    
    -- Alter the table to use text type
    ALTER TABLE pir_requests ALTER COLUMN status TYPE TEXT;
    
    -- Drop the existing enum type
    DROP TYPE pir_status CASCADE;
    
    -- Create the enum type with the canonical values
    CREATE TYPE pir_status AS ENUM (
      'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
    );
    
    -- Map any non-canonical values to canonical ones
    UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'in_review';
    UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'approved';
    UPDATE temp_pir_status SET status_text = 'rejected' WHERE status_text = 'flagged';
    
    -- Update the pir_requests table with the mapped values
    UPDATE pir_requests 
    SET status = temp_pir_status.status_text
    FROM temp_pir_status
    WHERE pir_requests.id = temp_pir_status.id;
    
    -- Alter the table to use the enum type
    ALTER TABLE pir_requests ALTER COLUMN status TYPE pir_status USING status::pir_status;
    
    -- Drop the temporary table
    DROP TABLE temp_pir_status;
  END IF;
END $$;
