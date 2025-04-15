#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Create New Database Migration ===${NC}\n"
}

# Print section
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Ensure migrations directory exists
check_migrations_dir() {
    print_section "Checking Migrations Directory"
    
    if [ ! -d "migrations" ]; then
        echo "Creating migrations directory..."
        mkdir -p migrations
    fi
    
    echo "✅ Migrations directory ready"
}

# Get migration details
get_migration_details() {
    print_section "Migration Details"
    
    # Get migration name
    while true; do
        read -p "Enter migration name (e.g., add_user_profile_table): " migration_name
        if [[ $migration_name =~ ^[a-z0-9_]+$ ]]; then
            break
        else
            print_error "Migration name can only contain lowercase letters, numbers, and underscores"
        fi
    done
    
    # Get migration description
    echo "Please provide a brief description of the migration:"
    read -p "> " migration_description
}

# Create migration file
create_migration_file() {
    print_section "Creating Migration File"
    
    # Generate timestamp
    timestamp=$(date +"%Y%m%d%H%M%S")
    
    # Create migration file
    migration_file="migrations/V${timestamp}__${migration_name}.sql"
    
    # Create migration content
    echo "-- Migration: ${migration_name}
-- Description: ${migration_description}
-- Created: $(date +"%Y-%m-%d %H:%M:%S")

-- Verify we're in a transaction
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        AND pid = pg_backend_pid()
    ) THEN
        RAISE EXCEPTION 'Migration must run within a transaction';
    END IF;
END;
\$\$;

-- Your migration code goes here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Verification queries
-- Add queries here to verify the migration was successful
-- Example:
-- DO \$\$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1
--         FROM information_schema.tables
--         WHERE table_name = 'example_table'
--     ) THEN
--         RAISE EXCEPTION 'Migration verification failed: example_table not created';
--     END IF;
-- END;
-- \$\$;

-- Update schema version
INSERT INTO schema_version (version, description, applied_at)
VALUES ('${timestamp}', '${migration_description}', NOW());
" > "$migration_file"

    echo "✅ Migration file created at $migration_file"
    
    # Open the file in the default editor
    if [ -n "$EDITOR" ]; then
        $EDITOR "$migration_file"
    else
        echo "
${BOLD}Next Steps:${NC}
1. Edit $migration_file with your migration SQL
2. Add verification queries to ensure the migration was successful
3. Test the migration locally before pushing to staging"
    fi
}

# Update documentation
update_documentation() {
    print_section "Updating Documentation"
    
    # Update migrations list
    migrations_doc="memory-bank/migrations.md"
    mkdir -p memory-bank
    
    if [ ! -f "$migrations_doc" ]; then
        echo "# Database Migrations

This document tracks all database migrations in the project.

## Migrations List
" > "$migrations_doc"
    fi
    
    echo "
### V${timestamp}__${migration_name}
- Description: ${migration_description}
- Created: $(date +"%Y-%m-%d %H:%M:%S")
- Status: Created, pending application
" >> "$migrations_doc"

    # Update activeContext.md
    active_context="memory-bank/activeContext.md"
    echo "
## New Migration: ${migration_name}
- Created: $(date +"%Y-%m-%d %H:%M:%S")
- Description: ${migration_description}
- File: V${timestamp}__${migration_name}.sql
" >> "$active_context"

    echo "✅ Documentation updated"
}

# Main function
main() {
    print_header
    
    # Run all steps
    check_migrations_dir
    get_migration_details
    create_migration_file
    update_documentation
    
    print_section "Next Steps"
    echo "1. Edit the migration file with your SQL changes"
    echo "2. Add verification queries to ensure the migration works"
    echo "3. Test the migration locally using the following command:"
    echo "   ./manage.sh -> Database Management -> Run database migrations"
    echo "4. After testing, commit your changes and push to staging"
}

# Make script executable
chmod +x "$0"

# Run main function
main 