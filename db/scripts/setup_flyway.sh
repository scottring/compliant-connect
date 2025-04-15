#!/bin/bash
set -e

echo "=== Setting Up Flyway for Database Migrations ==="
echo "================================================"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
  echo "Homebrew not found. Please install it first."
  echo "Visit https://brew.sh/ for installation instructions."
  exit 1
fi

# Install Flyway CLI
echo "Installing Flyway CLI..."
brew install flyway

# Create migrations directory
echo "Creating migrations directory structure..."
mkdir -p migrations/V1

# Create flyway.conf file
echo "Creating flyway.conf file..."
cat > flyway.conf << 'EOF'
# Flyway Configuration

# Staging Database
flyway.url=jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres
flyway.user=postgres
# flyway.password=your_password  # Uncomment and set your password
flyway.schemas=public
flyway.locations=filesystem:./migrations
flyway.baselineOnMigrate=true
flyway.outOfOrder=true
flyway.validateOnMigrate=true

# Development Database (for reference)
# flyway.url=jdbc:postgresql://db.oecravfbvupqgzfyizsi.supabase.co:5432/postgres
# flyway.user=postgres
# flyway.password=your_password
# flyway.schemas=public
# flyway.locations=filesystem:./migrations
# flyway.baselineOnMigrate=true
# flyway.outOfOrder=true
# flyway.validateOnMigrate=true
EOF

# Create baseline migration from existing schema
echo "Creating baseline migration from existing schema..."
cp supabase/migrations/20250414103000_base_schema.sql migrations/V1/V1__baseline_schema.sql

# Create migration to fix pir_status enum
echo "Creating migration to fix pir_status enum..."
cat > migrations/V1/V1.1__fix_pir_status_enum.sql << 'EOF'
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
EOF

# Create run_flyway_migrations.sh script
echo "Creating run_flyway_migrations.sh script..."
cat > run_flyway_migrations.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
STAGING_DB_URL="jdbc:postgresql://db.fubuiiecraslloezxshs.supabase.co:5432/postgres"
STAGING_DB_USER="postgres"

echo "=== Running Flyway Migrations for Staging Environment ==="
echo "Database URL: $STAGING_DB_URL"
echo "================================================"

# Check if Flyway CLI is installed
if ! command -v flyway &> /dev/null; then
  echo "Flyway CLI not found. Please install it first."
  exit 1
fi

# Prompt for database password
echo "Enter your database password:"
read -s DB_PASSWORD

# Run Flyway migrations
echo "Running Flyway migrations..."
flyway -url=$STAGING_DB_URL -user=$STAGING_DB_USER -password=$DB_PASSWORD -locations=filesystem:./migrations migrate

echo "================================================"
echo "Flyway migrations completed successfully!"
echo "================================================"

# Verify the migrations
echo "Verifying migrations..."
flyway -url=$STAGING_DB_URL -user=$STAGING_DB_USER -password=$DB_PASSWORD info

echo "================================================"
echo "Verification complete!"
echo "================================================"
EOF

# Make the script executable
chmod +x run_flyway_migrations.sh

echo "================================================"
echo "Flyway setup completed successfully!"
echo "To run the migrations, execute: ./run_flyway_migrations.sh"
echo "================================================"

# Add a note about updating the flyway.conf file
echo "NOTE: Please update the flyway.conf file with your database password before running the migrations."
echo "================================================"