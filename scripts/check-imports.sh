#!/bin/bash

# Find any files importing from the old Supabase path
echo "Checking for incorrect Supabase imports..."
INCORRECT_IMPORTS=$(grep -r --include="*.ts" --include="*.tsx" "from ['\"].*lib/supabase['\"]" src/)

if [ ! -z "$INCORRECT_IMPORTS" ]; then
  echo "Found incorrect Supabase imports:"
  echo "$INCORRECT_IMPORTS"
  echo "Please update these imports to use '@/integrations/supabase/client'"
  exit 1
else
  echo "No incorrect Supabase imports found."
  exit 0
fi 