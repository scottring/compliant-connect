# Flyway Implementation Plan for Compliant Connect

## Why Flyway?

Flyway is a database migration tool that can help us solve several issues we've encountered:

1. **Consistent Schema Across Environments**: Flyway ensures that all environments (development, staging, production) have the same schema structure by tracking which migrations have been applied.

2. **Versioned Migrations**: Each migration is versioned, making it easy to track changes and ensure they're applied in the correct order.

3. **Idempotent Migrations**: Flyway can handle idempotent migrations, ensuring that running the same migration multiple times doesn't cause errors.

4. **Validation**: Flyway validates the current state of the database against the expected state, alerting you to any discrepancies.

5. **Rollbacks**: Flyway supports undo migrations, allowing you to roll back changes if needed.

## Implementation Steps

### 1. Install Flyway

```bash
# Install Flyway CLI
brew install flyway
```

### 2. Set Up Flyway Configuration

Create a `flyway.conf` file in the project root:

```properties
# Flyway Configuration
flyway.url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres
flyway.user=postgres
flyway.password=your_password
flyway.schemas=public
flyway.locations=filesystem:./migrations
flyway.baselineOnMigrate=true
```

### 3. Organize Migrations

Create a `migrations` directory to store all migrations:

```bash
mkdir -p db/migrations/V1
```

### 4. Convert Existing Migrations

Convert existing Supabase migrations to Flyway format:

```bash
# Example: V1__baseline_schema.sql
cp supabase/db/migrations/20250414103000_base_schema.sql db/migrations/V1/V1__baseline_schema.sql
```

### 5. Create New Migrations for Enum Fixes

Create a specific migration to fix the pir_status enum:

```sql
-- V2__fix_pir_status_enum.sql
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
```

### 6. Create a Script to Run Flyway Migrations

Create a `run_flyway_migrations.sh` script:

```bash
#!/bin/bash
set -e

# Configuration
STAGING_DB_URL="jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres"
STAGING_DB_USER="postgres"
STAGING_DB_PASSWORD="your_password"

echo "=== Running Flyway Migrations for Staging Environment ==="
echo "Database URL: $STAGING_DB_URL"
echo "================================================"

# Check if Flyway CLI is installed
if ! command -v flyway &> /dev/null; then
  echo "Flyway CLI not found. Please install it first."
  exit 1
fi

# Run Flyway migrations
echo "Running Flyway migrations..."
flyway -url=$STAGING_DB_URL -user=$STAGING_DB_USER -password=$STAGING_DB_PASSWORD -locations=filesystem:./migrations migrate

echo "================================================"
echo "Flyway migrations completed successfully!"
echo "================================================"

# Verify the migrations
echo "Verifying migrations..."
flyway -url=$STAGING_DB_URL -user=$STAGING_DB_USER -password=$STAGING_DB_PASSWORD info

echo "================================================"
echo "Verification complete!"
echo "================================================"
```

### 7. Update CI/CD Pipeline

Update your CI/CD pipeline to run Flyway migrations automatically when deploying to staging or production:

```yaml
# Example GitHub Actions workflow
name: Deploy to Staging

on:
  push:
    branches: [ staging ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Flyway
        run: |
          wget -qO- https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/8.5.13/flyway-commandline-8.5.13-linux-x64.tar.gz | tar xvz
          sudo ln -s `pwd`/flyway-8.5.13/flyway /usr/local/bin/flyway
      
      - name: Run Flyway Migrations
        run: |
          flyway -url=${{ secrets.STAGING_DB_URL }} -user=${{ secrets.STAGING_DB_USER }} -password=${{ secrets.STAGING_DB_PASSWORD }} -locations=filesystem:./migrations migrate
      
      # Rest of your deployment steps
```

## Benefits of This Approach

1. **Consistency**: All environments will have the same schema structure.
2. **Versioning**: Changes are versioned and applied in the correct order.
3. **Validation**: Flyway validates the current state of the database against the expected state.
4. **Rollbacks**: You can roll back changes if needed.
5. **Automation**: Migrations can be automated as part of your CI/CD pipeline.

## Next Steps

1. Install Flyway CLI
2. Set up Flyway configuration
3. Convert existing migrations to Flyway format
4. Create new migrations for enum fixes
5. Run Flyway migrations on staging
6. Update CI/CD pipeline to run Flyway migrations automatically
7. Document the process for future reference