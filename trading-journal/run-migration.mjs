import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running migration: 20241122000000_add_missing_user_profile_columns.sql\n');

    // Read the migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20241122000000_add_missing_user_profile_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute raw SQL using Supabase client
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      // If the exec RPC doesn't exist, use fetch to call the REST API directly
      console.log('⚠️  RPC method not available, using direct SQL execution...\n');

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('✅ Migration completed successfully!\n');
      console.log('📝 Changes applied:');
      console.log('   - Added missing columns to user_profiles table');
      console.log('   - Timezone, default_broker, default_chart_type');
      console.log('   - items_per_page, default_date_range, show_pnl_percentage');
      console.log('   - max_risk_per_trade, max_daily_loss, max_position_size');
      console.log('   - confluences, theme, currency');
      console.log('   - full_name, experience_level, years_of_experience, trading_style');
      console.log('\n🎉 Your preferences and profile data will now persist after reload!');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log(data);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📋 Manual migration steps:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Navigate to SQL Editor');
    console.error('4. Open: supabase/migrations/20241122000000_add_missing_user_profile_columns.sql');
    console.error('5. Copy and paste the contents');
    console.error('6. Click "Run" to execute');
    process.exit(1);
  }
}

runMigration();
