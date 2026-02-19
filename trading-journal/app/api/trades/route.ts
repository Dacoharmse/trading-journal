import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/trades — insert a new trade (bypasses RLS using service role)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tradeData = await request.json()

    // Always enforce the user_id to the authenticated user
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('trades')
      .insert([{ ...tradeData, user_id: session.user.id }])
      .select()
      .single()

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

    const { data, error } = await admin
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

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
