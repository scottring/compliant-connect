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
