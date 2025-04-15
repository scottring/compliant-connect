#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Cleaning Up Directory Structure ===${NC}\n"
}

# Print section
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Create directory structure
create_directory_structure() {
    print_section "Creating Directory Structure"
    
    # Create main directories
    mkdir -p db/migrations
    mkdir -p db/backups
    mkdir -p db/scripts
    mkdir -p scripts/deployment
    mkdir -p scripts/development
    mkdir -p scripts/database
    mkdir -p scripts/troubleshooting
    mkdir -p docs/migrations
    mkdir -p docs/features
    mkdir -p docs/deployments
    mkdir -p .github/workflows
    
    echo "✅ Directory structure created"
}

# Move database files
organize_database_files() {
    print_section "Organizing Database Files"
    
    # Move migration files
    mv migrations/* db/migrations/ 2>/dev/null || true
    mv *.sql db/migrations/ 2>/dev/null || true
    
    # Move database scripts
    mv *flyway* db/scripts/ 2>/dev/null || true
    mv setup_flyway.sh db/scripts/ 2>/dev/null || true
    mv run_flyway_migrations.sh db/scripts/ 2>/dev/null || true
    
    echo "✅ Database files organized"
}

# Move documentation
organize_documentation() {
    print_section "Organizing Documentation"
    
    # Move migration documentation
    mv FLYWAY_*.md docs/migrations/ 2>/dev/null || true
    mv MIGRATION_README.md docs/migrations/ 2>/dev/null || true
    mv PIR_STATUS_STANDARDIZATION.md docs/migrations/ 2>/dev/null || true
    
    # Move deployment documentation
    mv STAGING_DEPLOYMENT.md docs/deployments/ 2>/dev/null || true
    
    # Move memory bank
    mv memory-bank/* docs/ 2>/dev/null || true
    
    echo "✅ Documentation organized"
}

# Move scripts
organize_scripts() {
    print_section "Organizing Scripts"
    
    # Move deployment scripts
    mv deploy_*.sh scripts/deployment/ 2>/dev/null || true
    mv set_edge_*.sh scripts/deployment/ 2>/dev/null || true
    mv switch_to_*.sh scripts/deployment/ 2>/dev/null || true
    
    # Move development scripts
    mv start_feature.sh scripts/development/ 2>/dev/null || true
    mv test_*.sh scripts/development/ 2>/dev/null || true
    
    # Move database scripts
    mv backup_db.sh scripts/database/ 2>/dev/null || true
    mv restore_db.sh scripts/database/ 2>/dev/null || true
    mv reset_dev_db.sh scripts/database/ 2>/dev/null || true
    mv run_migrations.sh scripts/database/ 2>/dev/null || true
    mv verify_database.sh scripts/database/ 2>/dev/null || true
    
    # Move troubleshooting scripts
    mv check_*.sh scripts/troubleshooting/ 2>/dev/null || true
    mv view_*.sh scripts/troubleshooting/ 2>/dev/null || true
    mv fix_*.sh scripts/troubleshooting/ 2>/dev/null || true
    
    echo "✅ Scripts organized"
}

# Update references in manage.sh
update_manage_script() {
    print_section "Updating Script References"
    
    # Update script paths in manage.sh
    sed -i '' 's|./scripts/start_feature.sh|./scripts/development/start_feature.sh|g' manage.sh
    sed -i '' 's|./scripts/switch_to_dev.sh|./scripts/deployment/switch_to_dev.sh|g' manage.sh
    sed -i '' 's|./scripts/switch_to_staging.sh|./scripts/deployment/switch_to_staging.sh|g' manage.sh
    sed -i '' 's|./scripts/create_migration.sh|./scripts/database/create_migration.sh|g' manage.sh
    sed -i '' 's|./scripts/test_local.sh|./scripts/development/test_local.sh|g' manage.sh
    sed -i '' 's|./scripts/push_to_staging.sh|./scripts/deployment/push_to_staging.sh|g' manage.sh
    sed -i '' 's|./scripts/deploy_staging.sh|./scripts/deployment/deploy_staging.sh|g' manage.sh
    sed -i '' 's|./scripts/deploy_production.sh|./scripts/deployment/deploy_production.sh|g' manage.sh
    sed -i '' 's|./scripts/deploy_edge_functions.sh|./scripts/deployment/deploy_edge_functions.sh|g' manage.sh
    sed -i '' 's|./scripts/set_edge_secrets.sh|./scripts/deployment/set_edge_secrets.sh|g' manage.sh
    sed -i '' 's|./scripts/verify_deployment.sh|./scripts/deployment/verify_deployment.sh|g' manage.sh
    sed -i '' 's|./scripts/run_migrations.sh|./scripts/database/run_migrations.sh|g' manage.sh
    sed -i '' 's|./scripts/verify_database.sh|./scripts/database/verify_database.sh|g' manage.sh
    sed -i '' 's|./scripts/reset_dev_db.sh|./scripts/database/reset_dev_db.sh|g' manage.sh
    sed -i '' 's|./scripts/backup_db.sh|./scripts/database/backup_db.sh|g' manage.sh
    sed -i '' 's|./scripts/restore_db.sh|./scripts/database/restore_db.sh|g' manage.sh
    sed -i '' 's|./scripts/check_status.sh|./scripts/troubleshooting/check_status.sh|g' manage.sh
    sed -i '' 's|./scripts/view_app_logs.sh|./scripts/troubleshooting/view_app_logs.sh|g' manage.sh
    sed -i '' 's|./scripts/view_db_logs.sh|./scripts/troubleshooting/view_db_logs.sh|g' manage.sh
    sed -i '' 's|./scripts/view_edge_logs.sh|./scripts/troubleshooting/view_edge_logs.sh|g' manage.sh
    sed -i '' 's|./scripts/run_validation.sh|./scripts/troubleshooting/run_validation.sh|g' manage.sh
    sed -i '' 's|./scripts/fix_common_issues.sh|./scripts/troubleshooting/fix_common_issues.sh|g' manage.sh
    
    echo "✅ Script references updated"
}

# Update documentation references
update_documentation_references() {
    print_section "Updating Documentation References"
    
    # Update paths in all markdown files
    find . -type f -name "*.md" -exec sed -i '' 's|memory-bank/|docs/|g' {} +
    find . -type f -name "*.md" -exec sed -i '' 's|migrations/|db/migrations/|g' {} +
    
    echo "✅ Documentation references updated"
}

# Clean up empty directories
cleanup_empty_dirs() {
    print_section "Cleaning Up Empty Directories"
    
    # Remove empty directories
    find . -type d -empty -delete
    
    echo "✅ Empty directories removed"
}

# Create new README
create_readme() {
    print_section "Creating New README"
    
    echo "# Compliant Connect

## Directory Structure

\`\`\`
.
├── db/
│   ├── migrations/    # Database migration files
│   ├── backups/      # Database backups
│   └── scripts/      # Database-related scripts
├── docs/
│   ├── migrations/   # Migration documentation
│   ├── features/     # Feature documentation
│   └── deployments/  # Deployment documentation
├── scripts/
│   ├── deployment/   # Deployment scripts
│   ├── development/  # Development workflow scripts
│   ├── database/     # Database management scripts
│   └── troubleshooting/ # Troubleshooting scripts
├── src/             # Application source code
├── public/          # Public assets
├── .github/         # GitHub configuration
└── manage.sh        # Main management script
\`\`\`

## Quick Start

1. Run the management tool:
   \`\`\`bash
   ./manage.sh
   \`\`\`

2. Choose from the following options:
   - Development Workflow
   - Deployment
   - Database Management
   - Troubleshooting

## Documentation

- Feature documentation: \`docs/features/\`
- Migration documentation: \`docs/migrations/\`
- Deployment documentation: \`docs/deployments/\`

## Scripts

All scripts are organized by category:
- Deployment scripts: \`scripts/deployment/\`
- Development scripts: \`scripts/development/\`
- Database scripts: \`scripts/database/\`
- Troubleshooting scripts: \`scripts/troubleshooting/\`

## Database

- Migrations: \`db/migrations/\`
- Backups: \`db/backups/\`
- Database scripts: \`db/scripts/\`
" > README.md

    echo "✅ New README created"
}

# Main function
main() {
    print_header
    
    # Confirm cleanup
    read -p "This will reorganize your directory structure. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled"
        exit 1
    fi
    
    # Create backup
    print_section "Creating Backup"
    timestamp=$(date +"%Y%m%d%H%M%S")
    tar -czf "backup_${timestamp}.tar.gz" .
    echo "✅ Backup created: backup_${timestamp}.tar.gz"
    
    # Run all steps
    create_directory_structure
    organize_database_files
    organize_documentation
    organize_scripts
    update_manage_script
    update_documentation_references
    cleanup_empty_dirs
    create_readme
    
    print_section "Cleanup Complete"
    echo "Your directory has been reorganized. Please review the changes and run your tests to ensure everything works as expected."
    echo "A backup of your original directory structure is saved in backup_${timestamp}.tar.gz"
}

# Make script executable
chmod +x "$0"

# Run main function
main 