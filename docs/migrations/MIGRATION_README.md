# Supabase Project Migration Guide

This guide explains how to migrate your Supabase project from development to staging or production using a clean schema approach.

## Migration Files

The following scripts have been created to help with the migration process:

1. `export_clean_schema.sh` - Exports a clean schema from your development project
2. `clean_schema_file.sh` - Cleans up the schema file to ensure idempotency
3. `apply_clean_schema.sh` - Applies the cleaned schema to your staging project
4. `migrate_clean_data.sh` - Generates a data migration script
5. `run_migration.sh` - Master script that runs the entire migration process
6. `switch_to_staging.sh` - Updates your local configuration to use the staging environment

## Migration Steps

### 1. Run the Migration Process

The migration process is fully automated with the `run_migration.sh` script:

```bash
# Make the script executable (if not already)
chmod +x run_migration.sh

# Run the migration process
./run_migration.sh
```

This will:
1. Export a clean schema from your development project
2. Clean up the schema file to ensure idempotency
3. Apply the cleaned schema to your staging project
4. Generate a data migration script

### 2. Migrate Your Data

After running the migration process, you'll need to manually migrate your data:

1. Open the Supabase SQL Editor for your development project:
   - Go to https://app.supabase.com/project/oecravfbvupqgzfyizsi/sql/new

2. Run the export queries from `data_migration.sql` to get your data as JSON

3. Open the Supabase SQL Editor for your staging project:
   - Go to https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new

4. Run the import queries from `data_migration.sql`, replacing the placeholders with your exported JSON data

### 3. Update Application Configuration

To update your local application to use the staging environment:

```bash
# Run the script
./switch_to_staging.sh
```

This will:
- Update your supabase/config.toml file with the new project ID
- Copy .env.staging to .env
- Link the Supabase CLI to the staging project

### 4. Testing

After completing the migration:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test all functionality to ensure everything works with the staging environment

## Project Information

### Development Project
- **Project ID:** oecravfbvupqgzfyizsi
- **Name:** stacks-2025.03.25-DEV
- **Region:** eu-central-1
- **URL:** https://oecravfbvupqgzfyizsi.supabase.co

### Staging Project
- **Project ID:** fubuiiecraslloezxshs
- **Name:** stacks-staging
- **Region:** us-east-2
- **URL:** https://fubuiiecraslloezxshs.supabase.co

## Benefits of the Clean Schema Approach

1. **Consistency:** Ensures that both development and staging environments have identical schema definitions
2. **Idempotency:** All schema operations are made idempotent with IF EXISTS/IF NOT EXISTS clauses
3. **Dependency Management:** Schema objects are created in the correct order to avoid dependency issues
4. **Enum Consistency:** Ensures that enum types have the same values across environments
5. **Future-Proofing:** Provides a solid foundation for future migrations

## Troubleshooting

If you encounter any issues:

1. Check the Supabase logs in the dashboard
2. Verify that all tables and data were migrated correctly
3. Ensure your application is using the correct environment variables
4. Check for any region-specific issues (the staging project is in us-east-2, while development is in eu-central-1)