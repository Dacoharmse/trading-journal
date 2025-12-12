import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDatabase() {
  console.log('🔍 Checking user_profiles table...\n');

  // Get all user profiles
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*');

  if (error) {
    console.error('❌ Error querying database:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No user profiles found in database');
    return;
  }

  console.log(`✅ Found ${data.length} user profile(s)\n`);

  data.forEach((profile, index) => {
    console.log(`Profile ${index + 1}:`);
    console.log('  User ID:', profile.user_id);
    console.log('  Full Name:', profile.full_name);
    console.log('  Experience Level:', profile.experience_level);
    console.log('  Years of Experience:', profile.years_of_experience);
    console.log('  Trading Style:', profile.trading_style);
    console.log('  Timezone:', profile.timezone);
    console.log('  Default Broker:', profile.default_broker);
    console.log('  Theme:', profile.theme);
    console.log('  Currency:', profile.currency);
    console.log('\n  All columns:', Object.keys(profile).join(', '));
    console.log('\n---\n');
  });

  // Check what columns actually exist in the table
  console.log('📋 Checking table schema...\n');
  const { data: columns, error: schemaError } = await supabase
    .rpc('exec', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

  if (schemaError) {
    console.log('⚠️  Could not fetch schema (this is okay)');
  } else if (columns) {
    console.log('Table columns:', columns);
  }
}

checkDatabase();
