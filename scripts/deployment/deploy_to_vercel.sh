#!/bin/bash
set -e

# Configuration
STAGING_PROJECT_ID="fubuiiecraslloezxshs"
VERCEL_PROJECT_NAME="compliant-connect-staging"  # Update this with your actual Vercel project name

echo "=== Deploying to Vercel with Staging Environment Variables ==="
echo "Supabase Project ID: $STAGING_PROJECT_ID"
echo "Vercel Project Name: $VERCEL_PROJECT_NAME"
echo "================================================"

# Load environment variables from .env.staging
if [ -f .env.staging ]; then
  echo "Loading environment variables from .env.staging..."
  cp .env.staging .env
else
  echo "Error: .env.staging file not found!"
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI not found. Installing..."
  npm install -g vercel
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "================================================"
echo "Deployment completed!"
echo "Your application is now deployed to Vercel with the staging environment variables."
echo "You can access your application at: https://$VERCEL_PROJECT_NAME.vercel.app"
echo "================================================"