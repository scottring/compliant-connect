#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Call the main script with development arguments
"$SCRIPT_DIR/switch_supabase_project.sh" "oecravfbvupqgzfyizsi" ".env.dev"