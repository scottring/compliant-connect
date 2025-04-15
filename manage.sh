#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Compliant Connect Management Tool ===${NC}\n"
}

# Print section header
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Check if required tools are installed
check_requirements() {
    print_section "Checking Requirements"
    
    local missing_tools=()
    
    # Check for required tools
    if ! command -v flyway &> /dev/null; then
        missing_tools+=("flyway")
    fi
    
    if ! command -v supabase &> /dev/null; then
        missing_tools+=("supabase CLI")
    fi
    
    if ! command -v vercel &> /dev/null; then
        missing_tools+=("vercel CLI")
    fi
    
    # If any tools are missing, print instructions
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "The following required tools are missing:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        
        echo -e "\nInstallation instructions:"
        echo "1. Flyway CLI: brew install flyway"
        echo "2. Supabase CLI: brew install supabase/tap/supabase"
        echo "3. Vercel CLI: npm install -g vercel"
        
        exit 1
    fi
    
    echo "✅ All required tools are installed"
}

# Development workflow menu
development_workflow() {
    while true; do
        print_section "Development Workflow"
        echo "1. Start new feature development"
        echo "2. Switch to development environment"
        echo "3. Switch to staging environment"
        echo "4. Create new database migration"
        echo "5. Test current changes locally"
        echo "6. Push changes to staging"
        echo "7. Back to main menu"
        
        read -p "Select an option (1-7): " choice
        
        case $choice in
            1)
                ./scripts/development/start_feature.sh
                ;;
            2)
                ./scripts/deployment/switch_to_dev.sh
                ;;
            3)
                ./scripts/deployment/switch_to_staging.sh
                ;;
            4)
                ./scripts/database/create_migration.sh
                ;;
            5)
                ./scripts/development/test_local.sh
                ;;
            6)
                ./scripts/deployment/push_to_staging.sh
                ;;
            7)
                break
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Deployment menu
deployment_menu() {
    while true; do
        print_section "Deployment Options"
        echo "1. Deploy to staging"
        echo "2. Deploy to production"
        echo "3. Deploy edge functions"
        echo "4. Set edge function secrets"
        echo "5. Verify deployment"
        echo "6. Back to main menu"
        
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                ./scripts/deployment/deploy_staging.sh
                ;;
            2)
                ./scripts/deployment/deploy_production.sh
                ;;
            3)
                ./scripts/deployment/deploy_edge_functions.sh
                ;;
            4)
                ./scripts/deployment/set_edge_secrets.sh
                ;;
            5)
                ./scripts/deployment/verify_deployment.sh
                ;;
            6)
                break
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Database management menu
database_menu() {
    while true; do
        print_section "Database Management"
        echo "1. Run database migrations"
        echo "2. Verify database state"
        echo "3. Reset development database"
        echo "4. Backup database"
        echo "5. Restore database"
        echo "6. Back to main menu"
        
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                ./scripts/database/run_migrations.sh
                ;;
            2)
                ./scripts/database/verify_database.sh
                ;;
            3)
                ./scripts/database/reset_dev_db.sh
                ;;
            4)
                ./scripts/database/backup_db.sh
                ;;
            5)
                ./scripts/database/restore_db.sh
                ;;
            6)
                break
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Troubleshooting menu
troubleshooting_menu() {
    while true; do
        print_section "Troubleshooting"
        echo "1. Check system status"
        echo "2. View application logs"
        echo "3. View database logs"
        echo "4. View edge function logs"
        echo "5. Run validation tests"
        echo "6. Fix common issues"
        echo "7. Back to main menu"
        
        read -p "Select an option (1-7): " choice
        
        case $choice in
            1)
                ./scripts/troubleshooting/check_status.sh
                ;;
            2)
                ./scripts/troubleshooting/view_app_logs.sh
                ;;
            3)
                ./scripts/troubleshooting/view_db_logs.sh
                ;;
            4)
                ./scripts/troubleshooting/view_edge_logs.sh
                ;;
            5)
                ./scripts/troubleshooting/run_validation.sh
                ;;
            6)
                ./scripts/troubleshooting/fix_common_issues.sh
                ;;
            7)
                break
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Main menu
main_menu() {
    while true; do
        print_header
        echo "1. Development Workflow"
        echo "2. Deployment"
        echo "3. Database Management"
        echo "4. Troubleshooting"
        echo "5. Check Requirements"
        echo "6. Exit"
        
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                development_workflow
                ;;
            2)
                deployment_menu
                ;;
            3)
                database_menu
                ;;
            4)
                troubleshooting_menu
                ;;
            5)
                check_requirements
                ;;
            6)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Make the script executable
chmod +x manage.sh

# Start the main menu
main_menu 