import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('Fetching trades table schema...')

// Try to get one row to see column names
const { data, error } = await supabase
  .from('trades')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('Available columns in trades table:')
  if (data && data.length > 0) {
    Object.keys(data[0]).forEach(col => console.log('  -', col))
  } else {
    console.log('No data in table, trying alternative method...')
    // Insert a test row to see what columns exist
    const { error: schemaError } = await supabase
      .from('trades')
      .select('id, user_id, symbol, direction, entry_price')
      .limit(0)
    
    if (schemaError) {
      console.error('Schema error:', schemaError.message)
    }
  }
}
