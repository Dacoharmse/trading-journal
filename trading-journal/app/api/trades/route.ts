import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/trades — fetch trades for the authenticated user (bypasses RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const admin = createAdminClient()

    const { data: trades, error, count } = await admin
      .from('trades')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('exit_date', { ascending: false, nullsFirst: false })
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Trades fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ trades: trades || [], count: count || 0 })
  } catch (err) {
    console.error('GET /api/trades error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

// Helper: strip unknown columns and retry when PostgREST schema cache is missing them
function isMissingColumnError(msg: string) {
  return msg.includes('Could not find the') && msg.includes('in the schema cache')
}
function stripUnknownColumn(data: Record<string, unknown>, errorMsg: string) {
  const match = errorMsg.match(/Could not find the '(\w+)' column/)
  if (match) {
    const col = match[1]
    const { [col]: _removed, ...rest } = data
    return rest
  }
  return null
}

// POST /api/trades — insert a new trade (bypasses RLS using service role)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tradeData = await request.json()
    const admin = createAdminClient()

    let payload: Record<string, unknown> = { ...tradeData, user_id: session.user.id }
    let { data, error } = await admin.from('trades').insert([payload]).select().single()

    // If a column doesn't exist yet (migration pending), strip it and retry once
    if (error && isMissingColumnError(error.message)) {
      console.warn('Missing column on insert, stripping and retrying:', error.message)
      const stripped = stripUnknownColumn(payload, error.message)
      if (stripped) {
        payload = stripped
        ;({ data, error } = await admin.from('trades').insert([payload]).select().single())
      }
    }

    if (error) {
      console.error('Trade insert error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint },
        { status: 400 }
      )
    }

    return NextResponse.json({ trade: data })
  } catch (err) {
    console.error('POST /api/trades error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save trade' },
      { status: 500 }
    )
  }
}

// PATCH /api/trades — update an existing trade (bypasses RLS using service role)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the trade belongs to this user before updating
    const { data: existing } = await admin
      .from('trades')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let updatePayload: Record<string, unknown> = { ...updateData }
    let { data, error } = await admin.from('trades').update(updatePayload).eq('id', id).select().single()

    // If a column doesn't exist yet (migration pending), strip it and retry once
    if (error && isMissingColumnError(error.message)) {
      console.warn('Missing column on update, stripping and retrying:', error.message)
      const stripped = stripUnknownColumn(updatePayload, error.message)
      if (stripped) {
        updatePayload = stripped
        ;({ data, error } = await admin.from('trades').update(updatePayload).eq('id', id).select().single())
      }
    }

    if (error) {
      console.error('Trade update error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint },
        { status: 400 }
      )
    }

    return NextResponse.json({ trade: data })
  } catch (err) {
    console.error('PATCH /api/trades error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update trade' },
      { status: 500 }
    )
  }
}

// DELETE /api/trades — delete a trade (bypasses RLS using service role)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify ownership before deleting
    const { data: existing } = await admin
      .from('trades')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('trades')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Trade delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/trades error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete trade' },
      { status: 500 }
    )
  }
}
