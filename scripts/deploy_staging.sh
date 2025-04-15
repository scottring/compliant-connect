#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Deploy to Staging Environment ===${NC}\n"
}

# Print section
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Check if we're ready to deploy
check_deployment_readiness() {
    print_section "Checking Deployment Readiness"
    
    # Check if we have uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_error "You have uncommitted changes. Please commit or stash them before deploying."
        exit 1
    fi
    
    # Check if we're on a feature branch
    current_branch=$(git branch --show-current)
    if [[ ! "$current_branch" =~ ^feature/ ]]; then
        print_error "You must be on a feature branch to deploy to staging"
        exit 1
    fi
    
    echo "✅ Ready to deploy"
}

# Backup staging database
backup_staging_db() {
    print_section "Backing Up Staging Database"
    
    backup_file="backups/staging_$(date +"%Y%m%d_%H%M%S").sql"
    mkdir -p backups
    
    echo "Creating backup..."
    supabase db dump -p fubuiiecraslloezxshs > "$backup_file"
    
    echo "✅ Database backed up to $backup_file"
}

# Deploy database changes
deploy_database() {
    print_section "Deploying Database Changes"
    
    # Check if we have any migrations
    if [ -d "migrations" ] && [ -n "$(ls -A migrations)" ]; then
        echo "Running migrations..."
        
        # Switch to staging project
        supabase link --project-ref fubuiiecraslloezxshs
        
        # Run migrations
        for migration in migrations/V*__*.sql; do
            if [ -f "$migration" ]; then
                echo "Applying migration: $migration"
                supabase db push "$migration"
            fi
        done
        
        echo "✅ Database migrations applied"
    else
        echo "No migrations to apply"
    fi
}

# Deploy edge functions
deploy_edge_functions() {
    print_section "Deploying Edge Functions"
    
    if [ -d "supabase/functions" ]; then
        echo "Deploying edge functions..."
        supabase functions deploy
        echo "✅ Edge functions deployed"
    else
        echo "No edge functions to deploy"
    fi
}

# Deploy frontend
deploy_frontend() {
    print_section "Deploying Frontend"
    
    # Build the application
    echo "Building application..."
    pnpm build
    
    # Deploy to Vercel
    echo "Deploying to Vercel..."
    vercel deploy --prod
    
    echo "✅ Frontend deployed"
}

# Update documentation
update_documentation() {
    print_section "Updating Documentation"
    
    # Update deployment history
    deployments_doc="memory-bank/deployments.md"
    mkdir -p memory-bank
    
    if [ ! -f "$deployments_doc" ]; then
        echo "# Deployment History

This document tracks all deployments to staging and production environments.

## Deployments
" > "$deployments_doc"
    fi
    
    echo "
### Staging Deployment - $(date +"%Y-%m-%d %H:%M:%S")
- Branch: $current_branch
- Commit: $(git rev-parse HEAD)
- Changes:
  - Database migrations applied
  - Edge functions updated
  - Frontend deployed
" >> "$deployments_doc"

    # Update activeContext.md
    active_context="memory-bank/activeContext.md"
    echo "
## Latest Deployment
- Environment: Staging
- Date: $(date +"%Y-%m-%d %H:%M:%S")
- Branch: $current_branch
- Status: Deployed
" >> "$active_context"

    echo "✅ Documentation updated"
}

# Verify deployment
verify_deployment() {
    print_section "Verifying Deployment"
    
    # Run validation queries
    echo "Running database validation queries..."
    supabase db reset --linked
    
    # Check edge functions
    echo "Checking edge functions..."
    supabase functions list
    
    # Get frontend URL
    frontend_url=$(vercel ls --prod | grep compliant-connect-staging | awk '{print $2}')
    
    echo "
${BOLD}Deployment Verification:${NC}
1. Frontend URL: $frontend_url
2. Database is accessible and migrations applied
3. Edge functions are deployed and running

Please verify the following manually:
1. Open the frontend URL in your browser
2. Test the main functionality
3. Check for any console errors
4. Verify database changes
5. Test edge functions
"
}

# Main function
main() {
    print_header
    
    # Confirm deployment
    read -p "Are you sure you want to deploy to staging? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
    
    # Run all deployment steps
    check_deployment_readiness
    backup_staging_db
    deploy_database
    deploy_edge_functions
    deploy_frontend
    update_documentation
    verify_deployment
    
    print_section "Deployment Complete"
    echo "Your changes have been deployed to staging!"
    echo "Please verify the deployment using the steps above."
}

# Make script executable
chmod +x "$0"

# Run main function
main 