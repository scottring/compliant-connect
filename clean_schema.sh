#!/bin/bash
set -e

# Configuration
INPUT_FILE="baseline_schema.sql"
OUTPUT_FILE="cleaned_schema.sql"

echo "Cleaning up schema file $INPUT_FILE..."

# Create a temporary file
TMP_FILE=$(mktemp)

# Process the schema file
cat $INPUT_FILE | while IFS= read -r line; do
  # Skip Supabase-specific artifacts that might cause conflicts
  if [[ $line == *"supabase_realtime"* ]] || [[ $line == *"auth.users"* ]] || [[ $line == *"auth.uid"* ]]; then
    continue
  fi

  # Make CREATE POLICY statements idempotent by wrapping them in DO blocks
  if [[ $line == CREATE\ POLICY* ]]; then
    policy_name=$(echo "$line" | grep -o '"[^"]*"' | head -1)
    table_name=$(echo "$line" | grep -o "ON \"public\"\.[^ ]*" | sed 's/ON "public"\.//g' | sed 's/"//g')
    
    echo "DO \$\$" >> $TMP_FILE
    echo "BEGIN" >> $TMP_FILE
    echo "    IF NOT EXISTS (" >> $TMP_FILE
    echo "        SELECT 1 FROM pg_policies" >> $TMP_FILE
    echo "        WHERE policyname = ${policy_name} AND tablename = '${table_name}' AND schemaname = 'public'" >> $TMP_FILE
    echo "    ) THEN" >> $TMP_FILE
    echo "        $line" >> $TMP_FILE
  elif [[ $line == CREATE\ TABLE* ]] && [[ $line != *"IF NOT EXISTS"* ]]; then
    # Make CREATE TABLE statements idempotent
    modified_line=${line/CREATE TABLE/CREATE TABLE IF NOT EXISTS}
    echo "$modified_line" >> $TMP_FILE
  elif [[ $line == ALTER\ TABLE* ]] && [[ $line == *ENABLE\ ROW\ LEVEL\ SECURITY* ]]; then
    # Make ENABLE ROW LEVEL SECURITY statements idempotent
    table_name=$(echo "$line" | grep -o "\"public\"\.[^ ]*" | sed 's/"public"\.//g' | sed 's/"//g')
    
    echo "DO \$\$" >> $TMP_FILE
    echo "BEGIN" >> $TMP_FILE
    echo "    IF NOT EXISTS (" >> $TMP_FILE
    echo "        SELECT 1 FROM pg_tables" >> $TMP_FILE
    echo "        WHERE tablename = '${table_name}' AND schemaname = 'public' AND rowsecurity = true" >> $TMP_FILE
    echo "    ) THEN" >> $TMP_FILE
    echo "        $line" >> $TMP_FILE
    echo "    END IF;" >> $TMP_FILE
    echo "END \$\$;" >> $TMP_FILE
  else
    # Pass through other lines unchanged
    echo "$line" >> $TMP_FILE
  fi
done

# Move the temporary file to the output file
mv $TMP_FILE $OUTPUT_FILE

echo "Schema cleaned successfully and saved to $OUTPUT_FILE"
echo "Now run apply_schema.sh to apply the schema to your staging database"