import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * PATCH /api/accounts - Update a trading account
 * Uses admin client to bypass RLS
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify the account belongs to this user
    const { data: existing } = await adminClient
      .from('accounts')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Build update object, only including defined values
    const dbUpdate: Record<string, any> = {}
    if (updateData.name !== undefined) dbUpdate.name = updateData.name
    if (updateData.broker !== undefined) dbUpdate.broker = updateData.broker
    if (updateData.accountType !== undefined) dbUpdate.account_type = updateData.accountType
    if (updateData.currency !== undefined) dbUpdate.currency = updateData.currency
    if (updateData.startingBalance !== undefined) dbUpdate.starting_balance = updateData.startingBalance
    if (updateData.tradingPairs !== undefined) dbUpdate.trading_pairs = updateData.tradingPairs
    if (updateData.isActive !== undefined) dbUpdate.is_active = updateData.isActive
    if (updateData.riskLimitType !== undefined) dbUpdate.risk_limit_type = updateData.riskLimitType
    if (updateData.riskLimitValue !== undefined) dbUpdate.risk_limit_value = updateData.riskLimitValue
    if (updateData.sessionRiskEnabled !== undefined) dbUpdate.session_risk_enabled = updateData.sessionRiskEnabled

    if (updateData.propFirmSettings !== undefined) {
      const pfs = updateData.propFirmSettings
      if (pfs.phase !== undefined) dbUpdate.phase = pfs.phase
      if (pfs.profitTarget !== undefined) dbUpdate.profit_target = pfs.profitTarget
      if (pfs.maxDrawdown !== undefined) dbUpdate.max_drawdown = pfs.maxDrawdown
      if (pfs.dailyDrawdown !== undefined) dbUpdate.daily_drawdown = pfs.dailyDrawdown
      if (pfs.status !== undefined) dbUpdate.account_status = pfs.status
      if (pfs.currentProfits !== undefined) dbUpdate.current_profits = pfs.currentProfits
      if (pfs.currentDrawdown !== undefined) dbUpdate.current_drawdown = pfs.currentDrawdown
    }

    const { error: updateError } = await adminClient
      .from('accounts')
      .update(dbUpdate)
      .eq('id', id)

    if (updateError) {
      console.error('Account update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/accounts - Delete a trading account
 * Uses admin client to bypass RLS
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify the account belongs to this user
    const { data: existing } = await adminClient
      .from('accounts')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { error: deleteError } = await adminClient
      .from('accounts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Account delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
