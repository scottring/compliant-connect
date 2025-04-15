#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Applying PIR Status Standardization Migration to Staging Environment ==="
echo "Supabase Project ID: $STAGING_PROJECT_ID"
echo "================================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI not found. Please install it first."
  exit 1
fi

# Link to the staging project
echo "Linking to the staging project..."
supabase link --project-ref $STAGING_PROJECT_ID

# Create a temporary SQL file with the migration
echo "Creating temporary SQL file..."
cat > temp_migration.sql << 'EOF'
-- Step 1: Map non-canonical values to canonical ones
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'in_review';
UPDATE pir_requests SET status = 'reviewed' WHERE status = 'approved';
UPDATE pir_requests SET status = 'rejected' WHERE status = 'flagged';

-- Step 2: Create a new enum type with only the canonical values
CREATE TYPE pir_status_new AS ENUM (
  'draft', 'sent', 'in_progress', 'submitted', 'reviewed', 'rejected', 'resubmitted', 'canceled'
);

-- Step 3: Update the pir_requests table to use the new enum type
ALTER TABLE pir_requests 
  ALTER COLUMN status TYPE pir_status_new 
  USING status::text::pir_status_new;

-- Step 4: Drop the old enum type and rename the new one
DROP TYPE pir_status;
ALTER TYPE pir_status_new RENAME TO pir_status;

-- Step 5: Update the constraint to match the new enum values
ALTER TABLE pir_requests DROP CONSTRAINT IF EXISTS pir_requests_status_check;
ALTER TABLE pir_requests ADD CONSTRAINT pir_requests_status_check
  CHECK (status::text = ANY (ARRAY['draft'::text, 'sent'::text, 'in_progress'::text, 'submitted'::text, 'reviewed'::text, 'rejected'::text, 'resubmitted'::text, 'canceled'::text]));

-- Step 6: Verify the enum values
SELECT enum_range(NULL::pir_status);
EOF

# Apply the migration using the Supabase dashboard SQL editor
echo "================================================"
echo "To apply the migration:"
echo "1. Go to https://app.supabase.com/project/$STAGING_PROJECT_ID/sql/new"
echo "2. Copy and paste the contents of temp_migration.sql"
echo "3. Run the SQL query"
echo "================================================"
echo "The migration SQL has been saved to temp_migration.sql"
echo "================================================"

# Display the migration SQL
echo "Migration SQL:"
echo "================================================"
cat temp_migration.sql
echo "================================================"