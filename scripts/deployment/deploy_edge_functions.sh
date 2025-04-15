#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"

echo "=== Deploying Supabase Edge Functions to Staging Environment ==="
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

# Deploy all Edge Functions
echo "Deploying Edge Functions..."

echo "1. Deploying get_dependents function..."
supabase functions deploy get_dependents --project-ref $STAGING_PROJECT_ID

echo "2. Deploying invite-user function..."
supabase functions deploy invite-user --project-ref $STAGING_PROJECT_ID

echo "3. Deploying send-email function..."
supabase functions deploy send-email --project-ref $STAGING_PROJECT_ID

echo "4. Deploying send-pir-notification function..."
supabase functions deploy send-pir-notification --project-ref $STAGING_PROJECT_ID

echo "5. Deploying test-email function..."
supabase functions deploy test-email --project-ref $STAGING_PROJECT_ID

echo "================================================"
echo "Edge Functions deployment completed!"
echo "Your Edge Functions are now deployed to the staging environment."
echo "================================================"