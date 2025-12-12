import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function checkCurrentUser() {
  console.log('🔍 Checking current session...\n');

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('❌ Error getting session:', error);
    return;
  }

  if (!session) {
    console.log('⚠️  No active session found');
    return;
  }

  console.log('✅ Active session found');
  console.log('  User ID:', session.user.id);
  console.log('  Email:', session.user.email);
  console.log('\n🔍 Looking for matching user_profile...\n');

  // Now use service role to check the profile
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profiles, error: profileError } = await adminClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.user.id);

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ NO PROFILE FOUND for this user_id!');
    console.log('   This is the problem - updates are failing because there\'s no matching row');
    return;
  }

  console.log(`✅ Found profile:`);
  console.log('  Profile ID:', profiles[0].id);
  console.log('  User ID (FK):', profiles[0].user_id);
  console.log('  Full Name:', profiles[0].full_name);
  console.log('  Experience Level:', profiles[0].experience_level);
  console.log('  Trading Style:', profiles[0].trading_style);
  console.log('  Timezone:', profiles[0].timezone);
  console.log('  Default Broker:', profiles[0].default_broker);
}

checkCurrentUser();
