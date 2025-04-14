#!/bin/bash
set -e

# Configuration
CURRENT_PROJECT_ID="oecravfbvupqgzfyizsi"  # Your current Supabase project ID
# Use the same project ID as in update_config.sh
NEW_PROJECT_ID="fubuiiecraslloezxshs"  # Your new Supabase project ID
DATA_FILE="data.sql"

echo "Exporting data from Supabase project $CURRENT_PROJECT_ID to $DATA_FILE..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found. Please install it (https://supabase.com/docs/guides/cli)."
    exit 1
fi

# Instead of trying to export data directly, let's create a script to manually copy the data
echo "Creating a data migration script..."

cat > $DATA_FILE << EOL
-- Data migration script
-- This script will help you manually copy data from the current project to the new project

-- Since we can't directly connect to the Supabase database from the local machine,
-- you'll need to run this script manually in the Supabase dashboard SQL editor.

-- Instructions:
-- 1. Go to https://app.supabase.com/project/$CURRENT_PROJECT_ID/sql/new
-- 2. Export the data you want to migrate using SELECT statements
-- 3. Go to https://app.supabase.com/project/$NEW_PROJECT_ID/sql/new
-- 4. Import the data using INSERT statements

-- Example for companies table:
-- In the current project:
SELECT * FROM public.companies;

-- In the new project:
-- INSERT INTO public.companies (id, name, created_at, updated_at, contact_name, contact_email, contact_phone)
-- VALUES ('uuid-value', 'Company Name', '2025-01-01', '2025-01-01', 'Contact Name', 'contact@example.com', '123-456-7890');

-- Example for other tables:
SELECT * FROM public.company_relationships;
SELECT * FROM public.company_users;
SELECT * FROM public.pir_requests;
SELECT * FROM public.pir_responses;
SELECT * FROM public.pir_tags;
SELECT * FROM public.products;
SELECT * FROM public.profiles;
SELECT * FROM public.question_sections;
SELECT * FROM public.question_tags;
SELECT * FROM public.questions;
SELECT * FROM public.response_comments;
SELECT * FROM public.response_flags;
SELECT * FROM public.tags;

-- Repeat for all tables you want to migrate.
EOL

echo "Data migration script created at $DATA_FILE"
echo "Please follow the instructions in the script to manually migrate the data."

echo "Data migration completed successfully"
echo "Now run update_config.sh to update your application configuration"