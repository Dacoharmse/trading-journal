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

async function fixDatabase() {
  console.log('🔍 Checking user_profiles table structure...\n');

  // Get all profiles with ALL columns
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, user_id, email, full_name, experience_level, trading_style, timezone, default_broker');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Current data:');
  console.table(data);

  console.log('\n📝 The problem: user_id column might not exist or data isn\'t being saved');
  console.log('\nTo fix this, we need to check if:');
  console.log('1. The user_id foreign key column exists');
  console.log('2. The UPDATE queries are matching the correct rows');
  console.log('\n💡 Suggested fix: Go to Supabase Dashboard > Table Editor > user_profiles');
  console.log('   and manually verify the data');
}

fixDatabase();
