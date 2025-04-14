#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Setting Edge Function Secrets for Staging Environment ==="
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

# Set the SENDGRID_API_KEY secret
echo "Setting SENDGRID_API_KEY secret..."
echo "Please enter your SendGrid API Key:"
read -s SENDGRID_API_KEY

if [ -z "$SENDGRID_API_KEY" ]; then
  echo "Error: SendGrid API Key cannot be empty."
  exit 1
fi

supabase secrets set SENDGRID_API_KEY="$SENDGRID_API_KEY" --project-ref $STAGING_PROJECT_ID

echo "================================================"
echo "Edge Function Secrets set successfully!"
echo "================================================"

# Redeploy the send-pir-notification function to ensure it picks up the new secret
echo "Redeploying send-pir-notification function..."
supabase functions deploy send-pir-notification --project-ref $STAGING_PROJECT_ID

echo "================================================"
echo "Edge Function redeployed successfully!"
echo "Your Edge Functions now have the necessary secrets."
echo "================================================"