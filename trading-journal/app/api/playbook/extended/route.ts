import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/playbook/extended?playbook_id=...
// Returns examples, trade_details, and indicators for a playbook (bypasses RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playbookId = request.nextUrl.searchParams.get('playbook_id')
    if (!playbookId) {
      return NextResponse.json({ error: 'playbook_id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const [examplesRes, detailsRes, indicatorsRes] = await Promise.all([
      admin.from('playbook_examples').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_trade_details').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_indicators').select('*').eq('playbook_id', playbookId).order('sort'),
    ])

    return NextResponse.json({
      examples: examplesRes.data ?? [],
      tradeDetails: detailsRes.data ?? [],
      indicators: indicatorsRes.data ?? [],
    })
  } catch (err) {
    console.error('GET /api/playbook/extended error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load playbook extended data' },
      { status: 500 }
    )
  }
}
