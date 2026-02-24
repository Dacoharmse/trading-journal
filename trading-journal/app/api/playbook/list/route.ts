import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/playbook/list — fetch all playbooks for the current user (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const userId = session.user.id

    const [playbooksRes, examplesRes, tradesRes] = await Promise.all([
      admin
        .from('playbooks')
        .select('*, playbook_rules(count), playbook_confluences(count)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      admin
        .from('playbook_examples')
        .select('playbook_id, media_urls, sort')
        .eq('user_id', userId)
        .order('sort', { ascending: true }),
      admin
        .from('trades')
        .select('id, playbook_id, pnl, r_multiple, closed_at, opened_at')
        .eq('user_id', userId)
        .not('playbook_id', 'is', null),
    ])

    if (playbooksRes.error) throw new Error(playbooksRes.error.message)

    return NextResponse.json({
      playbooks: playbooksRes.data ?? [],
      examples: examplesRes.data ?? [],
      trades: tradesRes.data ?? [],
    })
  } catch (err) {
    console.error('GET /api/playbook/list error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load playbooks' },
      { status: 500 }
    )
  }
}
