#!/bin/bash
set -e

# Configuration
# Use the same project ID as in update_config.sh
NEW_PROJECT_ID="fubuiiecraslloezxshs"
SCHEMA_FILE="cleaned_schema.sql"

echo "Applying schema from $SCHEMA_FILE to Supabase project $NEW_PROJECT_ID..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found. Please install it (https://supabase.com/docs/guides/cli)."
    exit 1
fi

# Link to the new project
echo "Linking to Supabase project $NEW_PROJECT_ID..."
supabase link --project-ref "$NEW_PROJECT_ID"

# Apply the schema using Supabase CLI
echo "Applying schema..."
# Create a temporary migration file in the supabase/migrations directory
mkdir -p supabase/migrations/temp
cp "$SCHEMA_FILE" "supabase/migrations/temp/migration.sql"

# Apply the migration using the linked project
supabase db push --linked

# Clean up
rm -rf supabase/migrations/temp

echo "Schema applied successfully to Supabase project $NEW_PROJECT_ID"
echo "If you need to migrate data, run migrate_data.sh next"