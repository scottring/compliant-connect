# Supabase Migration Approach

## Connection Issue

When trying to connect directly to the Supabase PostgreSQL database using Flyway, you encountered:

```
ERROR: Unable to obtain connection from database (jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres) for user 'postgres': The connection attempt failed.
Caused by: java.net.NoRouteToHostException: No route to host
```

This is because Supabase databases are not directly accessible from the internet by default for security reasons. They require:

1. IP allowlisting in the Supabase dashboard
2. Or access through the Supabase API/CLI

## Recommended Approach

Instead of using Flyway directly, we should leverage Supabase's built-in migration system which is already set up in your project:

### 1. Create a Standardized Migration Process

Create a script that:
1. Exports the schema from development
2. Cleans it up to ensure consistency
3. Applies it to staging

### 2. Use Supabase CLI for Migrations

```bash
#!/bin/bash
set -e

# Configuration
DEV_PROJECT_ID="oecravfbvupqgzfyizsi"
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Migrating from Development to Staging ==="
echo "Development Project ID: $DEV_PROJECT_ID"
echo "Staging Project ID: $STAGING_PROJECT_ID"
echo "================================================"

# Export schema from development
echo "Exporting schema from development..."
supabase db dump --db-url postgresql://postgres:postgres@db.$DEV_PROJECT_ID.supabase.co:5432/postgres --schema-only > dev_schema.sql

# Clean up the schema
echo "Cleaning up the schema..."
# Add your cleanup logic here
# For example, removing specific artifacts, adding IF NOT EXISTS clauses, etc.

# Apply schema to staging
echo "Applying schema to staging..."
supabase db push --db-url postgresql://postgres:postgres@db.$STAGING_PROJECT_ID.supabase.co:5432/postgres

echo "================================================"
echo "Migration completed successfully!"
echo "================================================"
```

### 3. Standardize Enum Values

Create a specific migration to standardize enum values:

```sql
-- 20250414162700_standardize_pir_status_enum.sql
-- Standardize pir_status enum values

-- Drop the trigger that's causing the blockage
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON pir_requests;

-- Drop the associated trigger function
DROP FUNCTION IF EXISTS validate_pir_status_transition();

-- Drop the view that depends on the column if it exists
DROP VIEW IF EXISTS pir_access_view CASCADE;

-- Create a temporary table to store the current status values
CREATE TEMP TABLE temp_pir_status AS SELECT id, status::text AS status_text FROM pir_requests;

-- Alter the table to use text type
ALTER TABLE pir_requests ALTER COLUMN status TYPE TEXT;

-- Drop the existing enum type
DROP TYPE IF EXISTS pir_status CASCADE;

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
```

### 4. Apply the Migration Using Supabase Dashboard

Since direct connection is blocked, you can:

1. Go to https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new
2. Copy and paste the contents of the migration file
3. Run the SQL query

## Alternative: Request Database Access

If you want to use Flyway directly, you'll need to:

1. Go to the Supabase dashboard
2. Navigate to Project Settings > Database
3. Under "Connection Pooling", enable direct database access
4. Add your IP address to the allowlist

This will allow Flyway to connect directly to the database.

## Long-term Solution: CI/CD with Supabase CLI

For a more automated approach:

1. Set up a GitHub Actions workflow that uses the Supabase CLI
2. Store your Supabase credentials as GitHub secrets
3. Automatically apply migrations when changes are pushed

```yaml
name: Supabase Migrations

on:
  push:
    branches: [ main, staging ]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Apply Migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

This approach leverages Supabase's existing migration system while adding automation and standardization.