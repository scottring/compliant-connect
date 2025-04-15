#!/bin/bash

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "\n${BOLD}${BLUE}=== Start New Feature Development ===${NC}\n"
}

# Print section
print_section() {
    echo -e "\n${BOLD}${GREEN}$1${NC}\n"
}

# Print error
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

# Ensure we're in development environment
check_environment() {
    print_section "Checking Environment"
    
    # Load development environment variables
    if [ -f .env.dev ]; then
        source .env.dev
        echo "✅ Development environment loaded"
    else
        print_error "Development environment file (.env.dev) not found"
        exit 1
    fi
    
    # Check if we're connected to development project
    if ! supabase projects list | grep -q "stacks-2025.03.25-DEV"; then
        print_error "Not connected to development project"
        echo "Running: supabase link --project-ref oecravfbvupqgzfyizsi"
        supabase link --project-ref oecravfbvupqgzfyizsi
    fi
}

# Create new feature branch
create_feature_branch() {
    print_section "Creating Feature Branch"
    
    # Get current branch
    current_branch=$(git branch --show-current)
    
    # Ensure we're on main
    if [ "$current_branch" != "main" ]; then
        echo "Switching to main branch..."
        git checkout main
    fi
    
    # Pull latest changes
    echo "Pulling latest changes..."
    git pull origin main
    
    # Get feature name
    read -p "Enter feature name (e.g., add-user-profile): " feature_name
    
    # Create and checkout feature branch
    branch_name="feature/${feature_name}"
    echo "Creating branch: $branch_name"
    git checkout -b "$branch_name"
    
    echo "✅ Feature branch created"
}

# Set up development environment
setup_environment() {
    print_section "Setting Up Environment"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        pnpm install
    fi
    
    # Copy development environment file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Setting up environment file..."
        cp .env.dev .env
    fi
    
    echo "✅ Environment setup complete"
}

# Create feature documentation
create_documentation() {
    print_section "Creating Feature Documentation"
    
    # Get feature description
    echo "Please provide a brief description of the feature:"
    read -p "> " feature_description
    
    # Create feature documentation file
    doc_dir="memory-bank/features"
    mkdir -p "$doc_dir"
    
    doc_file="$doc_dir/${feature_name}.md"
    
    echo "# Feature: ${feature_name}

## Description
${feature_description}

## Technical Details
- Branch: feature/${feature_name}
- Created: $(date +"%Y-%m-%d")
- Status: In Development

## Implementation Notes
- [ ] Frontend Changes Required
- [ ] Backend Changes Required
- [ ] Database Changes Required
- [ ] Edge Function Changes Required

## Testing Strategy
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] End-to-End Tests

## Dependencies
- List any new dependencies here

## Migration Requirements
- List any required database migrations here

## Documentation Updates
- List documentation that needs to be updated
" > "$doc_file"

    echo "✅ Feature documentation created at $doc_file"
}

# Update project documentation
update_project_docs() {
    print_section "Updating Project Documentation"
    
    # Update activeContext.md
    active_context="memory-bank/activeContext.md"
    echo "
## New Feature: ${feature_name}
- Started: $(date +"%Y-%m-%d")
- Description: ${feature_description}
- Branch: feature/${feature_name}
" >> "$active_context"

    # Update progress.md
    progress_file="memory-bank/progress.md"
    echo "
## In Progress
- ${feature_name}: Development started $(date +"%Y-%m-%d")
" >> "$progress_file"

    echo "✅ Project documentation updated"
}

# Main function
main() {
    print_header
    
    # Check if git is initialized
    if [ ! -d ".git" ]; then
        print_error "Git repository not initialized"
        exit 1
    fi
    
    # Run all setup steps
    check_environment
    create_feature_branch
    setup_environment
    create_documentation
    update_project_docs
    
    print_section "Next Steps"
    echo "1. Review the feature documentation in memory-bank/features/${feature_name}.md"
    echo "2. Start implementing your changes"
    echo "3. Create database migrations if needed (use option 4 in the Development menu)"
    echo "4. Test your changes locally (use option 5 in the Development menu)"
    echo "5. Push to staging when ready (use option 6 in the Development menu)"
}

# Make script executable
chmod +x "$0"

# Run main function
main 