import { supabase } from '../lib/supabaseClient';

export interface DatabaseStatus {
  isConnected: boolean;
  tablesExist: boolean;
  missingTables: string[];
  error?: string;
}

export const checkDatabaseStatus = async (): Promise<DatabaseStatus> => {
  const status: DatabaseStatus = {
    isConnected: false,
    tablesExist: false,
    missingTables: []
  };

  const requiredTables = ['users', 'products', 'cart_items', 'orders', 'order_items'];

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (error) {
      status.error = error.message;
      return status;
    }

    status.isConnected = true;

    // Check each required table
    for (const table of requiredTables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        if (tableError) {
          status.missingTables.push(table);
        }
      } catch (err) {
        status.missingTables.push(table);
      }
    }

    status.tablesExist = status.missingTables.length === 0;
    return status;

  } catch (error) {
    status.error = error instanceof Error ? error.message : 'Unknown error';
    return status;
  }
};

export const getDatabaseSetupInstructions = (status: DatabaseStatus): string => {
  if (!status.isConnected) {
    return `
🚨 DATABASE CONNECTION FAILED

The app cannot connect to your Supabase database. Please check:

1. Your Supabase project URL and API key in src/lib/supabaseClient.ts
2. Your Supabase project is active and running
3. Your internet connection

Error: ${status.error}
    `;
  }

  if (!status.tablesExist) {
    return `
🚨 DATABASE TABLES MISSING

The following tables are missing from your Supabase database:
${status.missingTables.map(table => `- ${table}`).join('\n')}

TO FIX THIS (5 minutes):

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (yclgaxigalixrimuixgo)
3. Click "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the ENTIRE contents of supabase-schema.sql file
6. Paste it into the SQL Editor
7. Click "Run" button (or press Ctrl+Enter)
8. Wait for "Success" message
9. Refresh this page

The supabase-schema.sql file is in your project root directory.
    `;
  }

  return `
✅ DATABASE SETUP COMPLETE

All required tables exist and the database is ready to use!
  `;
};
