import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/accounts — fetch accounts + playbooks for the authenticated user (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const [accountsResult, playbooksResult] = await Promise.all([
      admin
        .from('accounts')
        .select('id, name, currency, account_type, phase, account_status')
        .eq('user_id', session.user.id)
        .order('name'),
      admin
        .from('playbooks')
        .select('id, name, category, active')
        .eq('user_id', session.user.id)
        .order('name'),
    ])

    if (accountsResult.error) {
      console.error('Accounts fetch error:', accountsResult.error)
      return NextResponse.json({ error: accountsResult.error.message }, { status: 400 })
    }

    if (playbooksResult.error) {
      console.error('Playbooks fetch error:', playbooksResult.error)
      return NextResponse.json({ error: playbooksResult.error.message }, { status: 400 })
    }

    return NextResponse.json({
      accounts: accountsResult.data || [],
      playbooks: playbooksResult.data || [],
    })
  } catch (err) {
    console.error('GET /api/accounts error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
