import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/playbook/full?playbook_id=<id>
// Returns all data needed for the playbook editor in one request (bypasses RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playbookId = request.nextUrl.searchParams.get('playbook_id')
    if (!playbookId) {
      return NextResponse.json({ error: 'playbook_id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const [
      playbookRes, rulesRes, confRes, detailsRes,
      examplesRes, indicatorsRes, rubricRes, symbolsRes, tradesRes,
    ] = await Promise.all([
      admin.from('playbooks').select('*').eq('id', playbookId).maybeSingle(),
      admin.from('playbook_rules').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_confluences').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_trade_details').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_examples').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_indicators').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_rubric').select('*').eq('playbook_id', playbookId).maybeSingle(),
      admin.from('symbols').select('id, code, display_name').order('code'),
      admin
        .from('trades')
        .select('id, playbook_id, pnl, r_multiple, actual_rr, exit_date')
        .eq('playbook_id', playbookId),
    ])

    if (playbookRes.error) {
      return NextResponse.json({ error: playbookRes.error.message }, { status: 500 })
    }

    if (!playbookRes.data) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
    }

    return NextResponse.json({
      playbook: playbookRes.data,
      rules: rulesRes.data ?? [],
      confluences: confRes.data ?? [],
      tradeDetails: detailsRes.data ?? [],
      examples: examplesRes.data ?? [],
      indicators: indicatorsRes.data ?? [],
      rubric: rubricRes.data ?? null,
      symbols: symbolsRes.data ?? [],
      trades: tradesRes.data ?? [],
    })
  } catch (err) {
    console.error('GET /api/playbook/full error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load playbook' },
      { status: 500 }
    )
  }
}
