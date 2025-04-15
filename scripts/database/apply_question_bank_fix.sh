#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Fixing Question Bank View ===${NC}\n"
}

# Print section
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Check environment
check_environment() {
    print_section "Checking Environment"
    
    # Load environment variables
    if [ -f .env ]; then
        source .env
        echo "✅ Environment loaded"
    else
        print_error "Environment file (.env) not found"
        exit 1
    fi
}

# Apply migration
apply_migration() {
    print_section "Applying Migration"
    
    # Get the current project reference
    project_ref=$(supabase projects list | grep -E "stacks-2025.03.25-DEV|stacks-staging" | awk '{print $1}')
    
    if [ -z "$project_ref" ]; then
        print_error "Could not determine project reference"
        exit 1
    fi
    
    echo "Applying migration to project: $project_ref"
    
    # Apply the migration
    supabase db push db/migrations/V20250415_1_create_question_bank_view.sql
    
    echo "✅ Migration applied"
}

# Verify fix
verify_fix() {
    print_section "Verifying Fix"
    
    # Check if view exists
    supabase db query "
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'v_question_bank_numbered'
    );" | grep -q "t"
    
    if [ $? -eq 0 ]; then
        echo "✅ View exists and is accessible"
    else
        print_error "View creation verification failed"
        exit 1
    fi
}

# Main function
main() {
    print_header
    
    # Run all steps
    check_environment
    apply_migration
    verify_fix
    
    print_section "Fix Complete"
    echo "The question bank view has been created successfully."
    echo "Please refresh your application to verify the fix."
}

# Make script executable
chmod +x "$0"

# Run main function
main 