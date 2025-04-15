#!/bin/bash
set -e

# Configuration
DEV_PROJECT_ID="oecravfbvupqgzfyizsi"
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Copying Working Migration from Development to Staging ==="
echo "Development Project ID: $DEV_PROJECT_ID"
echo "Staging Project ID: $STAGING_PROJECT_ID"
echo "================================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI not found. Please install it first."
  exit 1
fi

# Create a migration file that drops and recreates the pir_status enum
echo "Creating migration file..."
cat > supabase/migrations/20250414161500_copy_working_pir_status_enum.sql << 'EOF'
-- Migration: Copy working pir_status enum from development
-- Description: This migration drops and recreates the pir_status enum to match the development environment.

-- Step 1: Create a temporary table to store the current status values
CREATE TEMP TABLE temp_pir_status AS SELECT id, status::text AS status_text FROM pir_requests;

-- Step 2: Alter the table to use text type
ALTER TABLE pir_requests ALTER COLUMN status TYPE TEXT;

-- Step 3: Drop the existing enum type
DROP TYPE IF EXISTS pir_status CASCADE;

-- Step 4: Create the enum type with the canonical values
CREATE TYPE pir_status AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
);

-- Step 5: Map any non-canonical values to canonical ones
UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'in_review';
UPDATE temp_pir_status SET status_text = 'reviewed' WHERE status_text = 'approved';
UPDATE temp_pir_status SET status_text = 'rejected' WHERE status_text = 'flagged';

-- Step 6: Update the pir_requests table with the mapped values
UPDATE pir_requests 
SET status = temp_pir_status.status_text
FROM temp_pir_status
WHERE pir_requests.id = temp_pir_status.id;

-- Step 7: Alter the table to use the enum type
ALTER TABLE pir_requests ALTER COLUMN status TYPE pir_status USING status::pir_status;

-- Step 8: Drop the temporary table
DROP TABLE temp_pir_status;

-- Step 9: Update the constraint to match the new enum values
ALTER TABLE pir_requests DROP CONSTRAINT IF EXISTS pir_requests_status_check;
ALTER TABLE pir_requests ADD CONSTRAINT pir_requests_status_check
  CHECK (status::text = ANY (ARRAY['draft'::text, 'sent'::text, 'in_progress'::text, 'submitted'::text, 'reviewed'::text, 'rejected'::text, 'resubmitted'::text, 'canceled'::text]));

-- Step 10: Log the standardization
DO $$
BEGIN
  RAISE NOTICE 'pir_status enum values have been standardized to match the development environment.';
END $$;
EOF

echo "Migration file created: supabase/migrations/20250414161500_copy_working_pir_status_enum.sql"
echo "================================================"

# Link to the staging project
echo "Linking to the staging project..."
supabase link --project-ref $STAGING_PROJECT_ID

# Apply the migration
echo "To apply the migration:"
echo "1. Go to https://app.supabase.com/project/$STAGING_PROJECT_ID/sql/new"
echo "2. Copy and paste the contents of supabase/migrations/20250414161500_copy_working_pir_status_enum.sql"
echo "3. Run the SQL query"
echo "================================================"
echo "Alternatively, you can run the following command to apply the migration:"
echo "supabase db push --db-url \"postgresql://postgres:postgres@db.$STAGING_PROJECT_ID.supabase.co:5432/postgres\""
echo "================================================"