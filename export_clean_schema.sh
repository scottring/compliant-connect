#!/bin/bash
set -e

# Configuration
DEV_PROJECT_ID="oecravfbvupqgzfyizsi"
CLEAN_SCHEMA_FILE="clean_schema.sql"

echo "Exporting clean schema from development project $DEV_PROJECT_ID..."

# Link to the development project
echo "Linking to development project..."
supabase link --project-ref "$DEV_PROJECT_ID"

# Export the schema using pg_dump directly
echo "Exporting schema..."
supabase db dump -s public > "$CLEAN_SCHEMA_FILE"

echo "Schema exported to $CLEAN_SCHEMA_FILE"
echo "Now edit the schema file to ensure:"
echo "- All CREATE statements use IF NOT EXISTS"
echo "- All DROP statements use IF EXISTS"
echo "- Enums are defined consistently"
echo "- Dependencies are created in the correct order"