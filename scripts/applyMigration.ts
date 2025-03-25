import { readFileSync } from 'fs';
import path from 'path';

/**
 * Applies a SQL migration file to the Supabase database
 */
async function applyMigration(filepath: string) {
  try {
    // Read the migration file
    const migrationPath = path.resolve(process.cwd(), filepath);
    console.log(`Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    
    // Print the SQL to be manually executed
    console.log('Please execute the following SQL using the Supabase MCP Server:');
    console.log('---------------------------------------------------------------');
    console.log(sql);
    console.log('---------------------------------------------------------------');
    console.log('After executing, update the database types with:');
    console.log('npx supabase gen types typescript --project-id <project-id> --schema public > src/integrations/supabase/types.ts');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get migration file path from command line arguments
const migrationFilePath = process.argv[2];

if (!migrationFilePath) {
  console.error('Please provide a migration file path');
  console.error('Example: npm run migration:print supabase/migrations/migration_file.sql');
  process.exit(1);
}

applyMigration(migrationFilePath); 