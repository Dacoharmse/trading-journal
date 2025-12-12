import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('Testing trades query...')

const { data, error, count } = await supabase
  .from('trades')
  .select('*', { count: 'exact' })
  .limit(1)

if (error) {
  console.error('Error:', error)
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  })
} else {
  console.log('Success! Found', count, 'trades')
  if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]))
  }
}
