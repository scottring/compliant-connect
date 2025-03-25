import { createClient } from '@supabase/supabase-js';
import { getScriptEnv, isDevelopment, isStaging } from '../src/config/scriptEnv';
import readline from 'readline';
import type { Database } from '../src/integrations/supabase/types';

// Parse command line arguments
const args = process.argv.slice(2);
const modeFlag = args.find(arg => arg.startsWith('--mode='));
const mode = modeFlag ? modeFlag.split('=')[1] : undefined;

// Get environment configuration
const env = getScriptEnv(mode);

// Create Supabase client
const supabase = createClient<Database>(
  env.supabase.url,
  env.supabase.anonKey
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function clearAllData(confirmationCode: string): Promise<{ success: boolean; message: string }> {
  // Safety checks
  if (!isDevelopment(env.app.env) && !isStaging(env.app.env)) {
    return {
      success: false,
      message: 'Database clearing is only allowed in development and staging environments'
    };
  }

  const expectedCode = `CLEAR-${env.app.env.toUpperCase()}-${new Date().getFullYear()}`;
  if (confirmationCode !== expectedCode) {
    return {
      success: false,
      message: `Invalid confirmation code. Expected: ${expectedCode}`
    };
  }

  try {
    // Get all tables in the public schema
    const { data: tables, error: fetchError } = await supabase
      .rpc('get_public_tables');

    if (fetchError) {
      throw new Error(`Error fetching tables: ${fetchError.message}`);
    }

    if (!tables || tables.length === 0) {
      throw new Error('No tables found');
    }

    // Disable RLS temporarily for the operation
    const { error: disableError } = await supabase
      .rpc('disable_rls_temporarily');

    if (disableError) {
      throw new Error(`Error disabling RLS: ${disableError.message}`);
    }

    // Clear each table
    for (const table of tables) {
      const { error: truncateError } = await supabase
        .rpc('truncate_table', { table_name: table.table_name });

      if (truncateError) {
        console.error(`Error clearing table ${table.table_name}:`, truncateError);
      }
    }

    // Re-enable RLS
    const { error: enableError } = await supabase
      .rpc('enable_rls');

    if (enableError) {
      console.error('Error re-enabling RLS:', enableError);
    }

    return {
      success: true,
      message: `Successfully cleared ${tables.length} tables in the ${env.app.env} environment`
    };

  } catch (error: any) {
    console.error('Error clearing database:', error);
    return {
      success: false,
      message: `Error clearing database: ${error.message}`
    };
  }
}

async function main() {
  console.log(`🚨 WARNING: You are about to clear ALL data in the ${env.app.env} environment 🚨`);
  console.log('This action cannot be undone!\n');

  const confirmationCode = `CLEAR-${env.app.env.toUpperCase()}-${new Date().getFullYear()}`;
  console.log(`To proceed, please type the following confirmation code: ${confirmationCode}`);

  const userInput = await promptUser('Confirmation code: ');

  if (userInput.trim() === confirmationCode) {
    console.log('\nClearing database...');
    const result = await clearAllData(confirmationCode);
    console.log(result.message);
  } else {
    console.log('\nConfirmation code does not match. Operation cancelled.');
  }

  rl.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
}); 