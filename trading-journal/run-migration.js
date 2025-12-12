const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Running migration: 20241122000000_add_missing_user_profile_columns.sql');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241122000000_add_missing_user_profile_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration using the Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // Try alternative approach using pg_stat_statements
      console.log('Trying alternative approach...');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;

        console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

        // Use the SQL query endpoint
        const { data, error } = await supabase.rpc('exec', {
          sql: statement + ';'
        });

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          throw error;
        }
      }

      console.log('\n✅ Migration completed successfully!');
      console.log('\nThe user_profiles table now has all required columns.');
      console.log('You can now save preferences and profile data, and they will persist after reload.');
      return;
    }

    const result = await response.json();
    console.log('✅ Migration completed successfully!');
    console.log(result);
    console.log('\nThe user_profiles table now has all required columns.');
    console.log('You can now save preferences and profile data, and they will persist after reload.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually:');
    console.error('1. Go to your Supabase Dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy the contents of supabase/migrations/20241122000000_add_missing_user_profile_columns.sql');
    console.error('4. Paste and execute in the SQL Editor');
    process.exit(1);
  }
}

runMigration();
