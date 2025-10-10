/**
 * Manual migration runner for Supabase
 *
 * Usage:
 * 1. Copy the SQL from supabase/migrations/*.sql
 * 2. Go to your Supabase project dashboard
 * 3. Navigate to SQL Editor
 * 4. Paste and run the SQL
 *
 * OR run this script with Node if you have a direct connection
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  console.log(`Found ${files.length} migration(s)`)

  for (const file of files) {
    console.log(`\nRunning migration: ${file}`)
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

    try {
      // Note: This won't work with standard Supabase client as it doesn't support raw SQL execution
      // You need to run these migrations via the Supabase Dashboard SQL Editor
      console.log('⚠️  Cannot execute SQL directly via client. Please run manually in Supabase Dashboard.')
      console.log('SQL Preview:')
      console.log(sql.substring(0, 200) + '...\n')
    } catch (err) {
      console.error(`Error in ${file}:`, err)
    }
  }
}

runMigrations().then(() => {
  console.log('\n✅ Migration review complete')
  console.log('\n📝 To apply migrations:')
  console.log('1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
  console.log('2. Copy SQL from: supabase/migrations/*.sql')
  console.log('3. Paste and run in SQL Editor')
})
