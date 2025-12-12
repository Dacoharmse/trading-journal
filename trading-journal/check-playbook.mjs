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
  .eq('name', 'Chronic Reversals')
  .single()

console.log('Playbook:', JSON.stringify(playbooks, null, 2))

if (playbooks) {
  const { data: rules } = await supabase
    .from('playbook_rules')
    .select('*')
    .eq('playbook_id', playbooks.id)
    .order('position')

  console.log('\nRules:')
  rules?.forEach(r => {
    console.log(`  ${r.type} | weight: ${r.weight} | ${r.label}`)
  })

  const { data: confluences } = await supabase
    .from('playbook_confluences')
    .select('*')
    .eq('playbook_id', playbooks.id)
    .order('position')

  console.log('\nConfluences:')
  confluences?.forEach(c => {
    console.log(`  weight: ${c.weight} | primary: ${c.primary_confluence} | ${c.label}`)
  })
}
