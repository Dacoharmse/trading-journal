import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const { data: playbooks } = await supabase
  .from('playbooks')
  .select('id, name, rubric, active')

console.log('All Playbooks:')
playbooks?.forEach(p => {
  console.log(`  ${p.id} | ${p.name} | active: ${p.active}`)
  console.log(`    Rubric:`, JSON.stringify(p.rubric, null, 2))
})
