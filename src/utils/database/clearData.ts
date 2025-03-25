import { supabase } from '@/integrations/supabase/client';
import { env, isDevelopment, isStaging } from '@/config/env';

interface TableInfo {
  name: string;
  schema: string;
}

export async function clearAllData(confirmationCode: string): Promise<{ success: boolean; message: string }> {
  // Safety checks
  if (!isDevelopment() && !isStaging()) {
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
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations') // Exclude migration table
      .neq('table_name', '_prisma_migrations'); // Exclude Prisma migrations if using Prisma

    if (fetchError) {
      throw new Error(`Error fetching tables: ${fetchError.message}`);
    }

    if (!tables) {
      throw new Error('No tables found');
    }

    // Disable triggers and foreign key checks
    await supabase.rpc('disable_triggers');

    // Clear each table
    for (const table of tables) {
      const { error: truncateError } = await supabase
        .from(table.table_name)
        .delete()
        .neq('id', 0); // This will delete all rows

      if (truncateError) {
        console.error(`Error clearing table ${table.table_name}:`, truncateError);
      }
    }

    // Re-enable triggers and foreign key checks
    await supabase.rpc('enable_triggers');

    return {
      success: true,
      message: `Successfully cleared ${tables.length} tables in the ${env.app.env} environment`
    };

  } catch (error) {
    console.error('Error clearing database:', error);
    return {
      success: false,
      message: `Error clearing database: ${error.message}`
    };
  }
} 