#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"
CLEANED_SCHEMA_FILE="cleaned_schema.sql"

echo "Applying clean schema to staging project $STAGING_PROJECT_ID..."

# Link to the staging project
echo "Linking to staging project..."
supabase link --project-ref "$STAGING_PROJECT_ID"

# Create a migration file with the cleaned schema
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
MIGRATION_DIR="supabase/migrations"
MIGRATION_FILE="${MIGRATION_DIR}/${TIMESTAMP}_apply_clean_schema.sql"

# Ensure the migrations directory exists
mkdir -p "$MIGRATION_DIR"

# Copy the cleaned schema to the migration file
cp "$CLEANED_SCHEMA_FILE" "$MIGRATION_FILE"

echo "Created migration file: $MIGRATION_FILE"

# Apply the migration
echo "Applying migration..."
supabase db push --linked

echo "Clean schema applied successfully to staging project"
echo "Now you can migrate your data using the data migration script"