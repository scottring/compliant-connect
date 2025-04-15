#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"
ENV_FILE=".env.staging"

echo "Switching Supabase project to staging..."
echo "  Project ID: $STAGING_PROJECT_ID"
echo "  Source Env: $ENV_FILE"
echo "---------------------------------"

# Update project_id in supabase/config.toml
echo "Updating project_id in supabase/config.toml..."
sed -i '' "s/^project_id = .*/project_id = \"$STAGING_PROJECT_ID\"/" supabase/config.toml
echo "Successfully updated project_id."

# Update .env from .env.staging
echo "Updating .env from $ENV_FILE..."
cp "$ENV_FILE" .env
echo "Successfully updated .env."

# Link Supabase CLI to the staging project
echo "Linking Supabase CLI to project $STAGING_PROJECT_ID..."
supabase link --project-ref "$STAGING_PROJECT_ID"
echo "Supabase CLI linked successfully."
echo "---------------------------------"

echo "Successfully switched to staging environment."
echo "NOTE: You might need to restart your development server (Vite) for .env changes to take full effect."