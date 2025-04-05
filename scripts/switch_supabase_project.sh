#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
CONFIG_TOML="supabase/config.toml"
TARGET_ENV=".env"

# --- Argument Validation ---
if [ "$#" -ne 2 ]; then
    echo "Error: Invalid number of arguments."
    echo "Usage: $0 <project_id> <source_env_file>"
    exit 1
fi

PROJECT_ID=$1
SOURCE_ENV_FILE=$2

# --- File Existence Checks ---
if [ ! -f "$CONFIG_TOML" ]; then
    echo "Error: Supabase config file not found at $CONFIG_TOML"
    exit 1
fi

if [ ! -f "$SOURCE_ENV_FILE" ]; then
    echo "Error: Source environment file not found at $SOURCE_ENV_FILE"
    exit 1
fi

echo "Switching Supabase project..."
echo "  Project ID: $PROJECT_ID"
echo "  Source Env: $SOURCE_ENV_FILE"
echo "---------------------------------"

# --- 1. Update supabase/config.toml ---
echo "Updating project_id in $CONFIG_TOML..."
# Use sed to replace the project_id line. -i '' is for macOS compatibility.
sed -i '' "s/^project_id = \".*\"/project_id = \"$PROJECT_ID\"/" "$CONFIG_TOML"
if [ $? -ne 0 ]; then
    echo "Error: Failed to update $CONFIG_TOML"
    exit 1
fi
echo "Successfully updated project_id."

# --- 2. Update .env file ---
echo "Updating $TARGET_ENV from $SOURCE_ENV_FILE..."
cp "$SOURCE_ENV_FILE" "$TARGET_ENV"
if [ $? -ne 0 ]; then
    echo "Error: Failed to copy $SOURCE_ENV_FILE to $TARGET_ENV"
    exit 1
fi
echo "Successfully updated $TARGET_ENV."

# --- 3. Link Supabase CLI ---
echo "Linking Supabase CLI to project $PROJECT_ID..."
# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found. Please install it (https://supabase.com/docs/guides/cli)."
    exit 1
fi

# Attempt to link
if supabase link --project-ref "$PROJECT_ID"; then
    echo "Supabase CLI linked successfully."
else
    echo "---------------------------------"
    echo "Warning: Failed to link Supabase CLI."
    echo "Please ensure you are logged in ('supabase login') and the project ID is correct."
    echo "Manual linking command: supabase link --project-ref $PROJECT_ID"
    # Decide if this should be a fatal error - for now, just warn
    # exit 1
fi

echo "---------------------------------"
echo "Successfully switched environment configuration."
echo "NOTE: You might need to restart your development server (Vite) for .env changes to take full effect."
exit 0