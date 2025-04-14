#!/bin/bash
set -e

echo "=== Modifying RequestSheetModal.tsx to Bypass Email Notification ==="

# Create a backup of the original file
cp src/components/suppliers/RequestSheetModal.tsx src/components/suppliers/RequestSheetModal.tsx.bak

# Modify the file to bypass the email notification
sed -i '' 's/status: '\''sent'\''/status: '\''draft'\''/g' src/components/suppliers/RequestSheetModal.tsx

echo "=== RequestSheetModal.tsx Modified Successfully ==="
echo "The PIR request will now be created with status 'draft' instead of 'sent'."
echo "This will bypass the email notification functionality and should fix the issue."
echo "To revert this change, run: cp src/components/suppliers/RequestSheetModal.tsx.bak src/components/suppliers/RequestSheetModal.tsx"