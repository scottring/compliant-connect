#!/bin/bash
set -e

# Configuration
DEV_PROJECT_ID="oecravfbvupqgzfyizsi"
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Comprehensive Supabase Migration Process ==="
echo "From: $DEV_PROJECT_ID (Development)"
echo "To:   $STAGING_PROJECT_ID (Staging)"
echo "================================================"

# Make all scripts executable
chmod +x export_clean_schema.sh
chmod +x clean_schema_file.sh
chmod +x apply_clean_schema.sh
chmod +x migrate_clean_data.sh

# Step 1: Export clean schema from development
echo -e "\n\n=== STEP 1: Exporting clean schema from development ==="
./export_clean_schema.sh

# Step 2: Clean the schema file
echo -e "\n\n=== STEP 2: Cleaning the schema file ==="
./clean_schema_file.sh

# Step 3: Apply the cleaned schema to staging
echo -e "\n\n=== STEP 3: Applying cleaned schema to staging ==="
./apply_clean_schema.sh

# Step 4: Generate data migration script
echo -e "\n\n=== STEP 4: Generating data migration script ==="
./migrate_clean_data.sh

echo -e "\n\n=== Migration process completed ==="
echo "To complete the data migration:"
echo "1. Open the Supabase SQL Editor for your development project"
echo "   https://app.supabase.com/project/$DEV_PROJECT_ID/sql/new"
echo "2. Run the export queries from data_migration.sql to get your data as JSON"
echo "3. Open the Supabase SQL Editor for your staging project"
echo "   https://app.supabase.com/project/$STAGING_PROJECT_ID/sql/new"
echo "4. Run the import queries from data_migration.sql, replacing the placeholders with your exported JSON data"
echo "5. Update your application configuration to use the staging environment"
echo "   ./switch_to_staging.sh"
echo "6. Test your application with the staging environment"
echo "================================================"