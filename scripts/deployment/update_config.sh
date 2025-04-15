#!/bin/bash
set -e

# Configuration
CURRENT_PROJECT_ID="oecravfbvupqgzfyizsi"  # Your current Supabase project ID
NEW_PROJECT_ID="fubuiiecraslloezxshs"  # Your new Supabase project ID
ENV_FILE=".env.new_staging"

# Get the directory where the script is located
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "Creating new environment file $ENV_FILE..."

# Create a new environment file for the new staging project
cat > $ENV_FILE << EOL
# Supabase Configuration for New Staging Environment
VITE_SUPABASE_URL=https://$NEW_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YnVpaWVjcmFzbGxvZXp4c2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDE2MzcsImV4cCI6MjA2MDIxNzYzN30.j_96iRCDEbMrSjB6_ZyiB1Mv7BZvqqOq29thkyxjE54
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YnVpaWVjcmFzbGxvZXp4c2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDY0MTYzNywiZXhwIjoyMDYwMjE3NjM3fQ.KTWOwsVn3DWTp6fy5E_fNwC2dmEGLwTO9rA-68BVFgU
VITE_APP_ENV=staging
EOL

echo "Environment file created successfully"
echo "Updating application configuration..."

# Call the switch_supabase_project.sh script to update the configuration
"$SCRIPT_DIR/scripts/switch_supabase_project.sh" "$NEW_PROJECT_ID" "$ENV_FILE"

echo "Application configuration updated successfully"
echo "Please test your application to ensure everything works as expected"