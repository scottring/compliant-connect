#!/bin/bash
set -e

# Configuration
INPUT_SCHEMA_FILE="clean_schema.sql"
OUTPUT_SCHEMA_FILE="cleaned_schema.sql"

echo "Cleaning up schema file $INPUT_SCHEMA_FILE..."

# Create a temporary file
TMP_FILE=$(mktemp)

# Process the schema file
cat "$INPUT_SCHEMA_FILE" | sed -E '
    # Add IF NOT EXISTS to CREATE TABLE statements
    s/CREATE TABLE ([^;]*)/CREATE TABLE IF NOT EXISTS \1/g;
    
    # Add IF NOT EXISTS to CREATE INDEX statements
    s/CREATE INDEX ([^;]*)/CREATE INDEX IF NOT EXISTS \1/g;
    
    # Add IF NOT EXISTS to CREATE UNIQUE INDEX statements
    s/CREATE UNIQUE INDEX ([^;]*)/CREATE UNIQUE INDEX IF NOT EXISTS \1/g;
    
    # Add IF EXISTS to DROP statements
    s/DROP TABLE ([^;]*)/DROP TABLE IF EXISTS \1/g;
    s/DROP INDEX ([^;]*)/DROP INDEX IF EXISTS \1/g;
    s/DROP TYPE ([^;]*)/DROP TYPE IF EXISTS \1/g;
    
    # Remove owner statements
    /^ALTER TABLE.*OWNER TO/d;
    /^ALTER SEQUENCE.*OWNER TO/d;
    /^ALTER VIEW.*OWNER TO/d;
    /^ALTER FUNCTION.*OWNER TO/d;
    
    # Remove comments that might cause issues
    /^COMMENT ON/d;
' > "$TMP_FILE"

# Simple processing for CREATE POLICY statements
grep -v "CREATE POLICY" "$TMP_FILE" > "$OUTPUT_SCHEMA_FILE"

# Process CREATE POLICY statements separately
grep "CREATE POLICY" "$TMP_FILE" | while read -r policy_line; do
    policy_name=$(echo "$policy_line" | grep -o '"[^"]*"' | head -1 | tr -d '"')
    policy_table=$(echo "$policy_line" | grep -o 'ON "public"."[^"]*"' | sed 's/ON "public"."//g' | sed 's/"//g')
    
    if [ -n "$policy_name" ] && [ -n "$policy_table" ]; then
        echo "DO \$\$" >> "$OUTPUT_SCHEMA_FILE"
        echo "BEGIN" >> "$OUTPUT_SCHEMA_FILE"
        echo "    IF NOT EXISTS (" >> "$OUTPUT_SCHEMA_FILE"
        echo "        SELECT 1 FROM pg_policies" >> "$OUTPUT_SCHEMA_FILE"
        echo "        WHERE policyname = '$policy_name' AND tablename = '$policy_table' AND schemaname = 'public'" >> "$OUTPUT_SCHEMA_FILE"
        echo "    ) THEN" >> "$OUTPUT_SCHEMA_FILE"
        echo "        $policy_line" >> "$OUTPUT_SCHEMA_FILE"
        echo "    END IF;" >> "$OUTPUT_SCHEMA_FILE"
        echo "END \$\$;" >> "$OUTPUT_SCHEMA_FILE"
        echo "" >> "$OUTPUT_SCHEMA_FILE"
    fi
done

# Clean up
rm "$TMP_FILE"

echo "Schema cleaned and saved to $OUTPUT_SCHEMA_FILE"
echo "Now you can apply this schema to your staging environment"