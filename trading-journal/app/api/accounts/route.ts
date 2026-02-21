import { NextRequest, NextResponse } from 'next/server'
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

// PATCH /api/accounts — update an account
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...update } = body

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Map camelCase AccountUpdate fields to DB column names
    const dbUpdate: Record<string, unknown> = {}
    if (update.name !== undefined) dbUpdate.name = update.name
    if (update.broker !== undefined) dbUpdate.broker = update.broker
    if (update.accountType !== undefined) dbUpdate.account_type = update.accountType
    if (update.currency !== undefined) dbUpdate.currency = update.currency
    if (update.startingBalance !== undefined) dbUpdate.starting_balance = update.startingBalance
    if (update.tradingPairs !== undefined) dbUpdate.trading_pairs = update.tradingPairs
    if (update.isActive !== undefined) dbUpdate.is_active = update.isActive
    if (update.riskLimitType !== undefined) dbUpdate.risk_limit_type = update.riskLimitType
    if (update.riskLimitValue !== undefined) dbUpdate.risk_limit_value = update.riskLimitValue
    if (update.sessionRiskEnabled !== undefined) dbUpdate.session_risk_enabled = update.sessionRiskEnabled
    if (update.propFirmSettings !== undefined) {
      const p = update.propFirmSettings
      if (p.phase !== undefined) dbUpdate.phase = p.phase
      if (p.profitTarget !== undefined) dbUpdate.profit_target = p.profitTarget
      if (p.maxDrawdown !== undefined) dbUpdate.max_drawdown = p.maxDrawdown
      if (p.dailyDrawdown !== undefined) dbUpdate.daily_drawdown = p.dailyDrawdown
      if (p.status !== undefined) dbUpdate.account_status = p.status
      if (p.currentProfits !== undefined) dbUpdate.current_profits = p.currentProfits
      if (p.currentDrawdown !== undefined) dbUpdate.current_drawdown = p.currentDrawdown
    }

    const { error } = await admin
      .from('accounts')
      .update(dbUpdate)
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('PATCH /api/accounts error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/accounts error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts?id=... — delete an account
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('DELETE /api/accounts error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/accounts error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete account' },
      { status: 500 }
    )
  }
}
