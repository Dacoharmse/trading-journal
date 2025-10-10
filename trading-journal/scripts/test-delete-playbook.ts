/**
 * Test script for playbook deletion functionality
 * This script:
 * 1. Creates a test playbook with rules and confluences
 * 2. Verifies it exists in the database
 * 3. Deletes the playbook
 * 4. Verifies cascading delete worked (rules/confluences also deleted)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDeletePlaybook() {
  console.log('🧪 Starting Playbook Delete Test\n')

  try {
    // Step 1: Get the first user for testing
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ No authenticated user found. Please log in first.')
      process.exit(1)
    }

    console.log(`✅ Authenticated as user: ${user.email}\n`)

    // Step 2: Create a test playbook
    console.log('📝 Creating test playbook...')
    const { data: playbook, error: playbookError } = await supabase
      .from('playbooks')
      .insert({
        user_id: user.id,
        name: '🧪 TEST DELETE ME - Asia Breakout Test',
        description: 'This is a test playbook that will be deleted',
        category: 'ICT',
        sessions: ['Asia', 'London'],
        rr_min: 2.0,
        active: true,
      })
      .select()
      .single()

    if (playbookError || !playbook) {
      console.error('❌ Failed to create test playbook:', playbookError)
      process.exit(1)
    }

    console.log(`✅ Created playbook: ${playbook.name} (ID: ${playbook.id})\n`)

    // Step 3: Add rules to the playbook
    console.log('📋 Adding rules...')
    const { data: rules, error: rulesError } = await supabase
      .from('playbook_rules')
      .insert([
        {
          playbook_id: playbook.id,
          label: 'Test Rule 1: Define Asia range',
          type: 'must',
          weight: 1.0,
          sort: 0,
        },
        {
          playbook_id: playbook.id,
          label: 'Test Rule 2: Check HTF bias',
          type: 'should',
          weight: 1.0,
          sort: 1,
        },
      ])
      .select()

    if (rulesError) {
      console.error('❌ Failed to create rules:', rulesError)
      process.exit(1)
    }

    console.log(`✅ Added ${rules?.length || 0} rules\n`)

    // Step 4: Add confluences to the playbook
    console.log('🎯 Adding confluences...')
    const { data: confluences, error: confluencesError } = await supabase
      .from('playbook_confluences')
      .insert([
        {
          playbook_id: playbook.id,
          label: 'Test Confluence 1: PDH/PDL',
          weight: 1.0,
          primary_confluence: true,
          sort: 0,
        },
        {
          playbook_id: playbook.id,
          label: 'Test Confluence 2: VWAP',
          weight: 1.0,
          primary_confluence: false,
          sort: 1,
        },
      ])
      .select()

    if (confluencesError) {
      console.error('❌ Failed to create confluences:', confluencesError)
      process.exit(1)
    }

    console.log(`✅ Added ${confluences?.length || 0} confluences\n`)

    // Step 5: Add rubric to the playbook
    console.log('📊 Adding rubric...')
    const { error: rubricError } = await supabase
      .from('playbook_rubric')
      .insert({
        playbook_id: playbook.id,
        weight_rules: 0.6,
        weight_confluences: 0.4,
        must_rule_penalty: 0.4,
        min_checks: 0,
      })

    if (rubricError) {
      console.error('❌ Failed to create rubric:', rubricError)
      process.exit(1)
    }

    console.log('✅ Added rubric\n')

    // Step 6: Verify everything was created
    console.log('🔍 Verifying created data...')
    const { count: rulesCount } = await supabase
      .from('playbook_rules')
      .select('*', { count: 'exact', head: true })
      .eq('playbook_id', playbook.id)

    const { count: confluencesCount } = await supabase
      .from('playbook_confluences')
      .select('*', { count: 'exact', head: true })
      .eq('playbook_id', playbook.id)

    const { data: rubric } = await supabase
      .from('playbook_rubric')
      .select('*')
      .eq('playbook_id', playbook.id)
      .single()

    console.log(`✅ Verified: ${rulesCount} rules, ${confluencesCount} confluences, rubric: ${rubric ? 'exists' : 'missing'}\n`)

    // Step 7: DELETE the playbook
    console.log('🗑️  DELETING playbook...')
    const { error: deleteError } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', playbook.id)

    if (deleteError) {
      console.error('❌ Failed to delete playbook:', deleteError)
      process.exit(1)
    }

    console.log('✅ Playbook deleted successfully\n')

    // Step 8: Verify cascading deletes worked
    console.log('🔍 Verifying cascade deletes...')

    const { data: playbookCheck } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', playbook.id)
      .single()

    const { count: rulesCheckCount } = await supabase
      .from('playbook_rules')
      .select('*', { count: 'exact', head: true })
      .eq('playbook_id', playbook.id)

    const { count: confluencesCheckCount } = await supabase
      .from('playbook_confluences')
      .select('*', { count: 'exact', head: true })
      .eq('playbook_id', playbook.id)

    const { data: rubricCheck } = await supabase
      .from('playbook_rubric')
      .select('*')
      .eq('playbook_id', playbook.id)
      .single()

    // Verify everything is gone
    const allDeleted =
      !playbookCheck &&
      rulesCheckCount === 0 &&
      confluencesCheckCount === 0 &&
      !rubricCheck

    if (allDeleted) {
      console.log('✅ CASCADE DELETE SUCCESSFUL!')
      console.log('   - Playbook: deleted ✓')
      console.log('   - Rules: deleted ✓')
      console.log('   - Confluences: deleted ✓')
      console.log('   - Rubric: deleted ✓')
      console.log('\n🎉 ALL TESTS PASSED!\n')
    } else {
      console.error('❌ CASCADE DELETE FAILED:')
      console.log(`   - Playbook: ${playbookCheck ? 'still exists ✗' : 'deleted ✓'}`)
      console.log(`   - Rules: ${rulesCheckCount === 0 ? 'deleted ✓' : `${rulesCheckCount} remaining ✗`}`)
      console.log(`   - Confluences: ${confluencesCheckCount === 0 ? 'deleted ✓' : `${confluencesCheckCount} remaining ✗`}`)
      console.log(`   - Rubric: ${rubricCheck ? 'still exists ✗' : 'deleted ✓'}`)
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the test
testDeletePlaybook()
