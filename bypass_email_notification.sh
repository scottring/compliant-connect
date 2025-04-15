#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Bypassing Email Notification in Staging Environment ==="
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

# Execute the SQL file
echo "Executing bypass_email_notification.sql..."
supabase db execute --file bypass_email_notification.sql

echo "================================================"
echo "Email notification bypass has been applied."
echo "You should now be able to create PIR requests with status 'sent' without triggering email notifications."
echo "================================================"

# Alternative approach: Use the Supabase dashboard
echo "If the above approach doesn't work, you can also:"
echo "1. Go to https://app.supabase.com/project/$STAGING_PROJECT_ID/sql/new"
echo "2. Copy and paste the contents of bypass_email_notification.sql"
echo "3. Run the SQL query"
echo "================================================"