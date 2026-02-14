import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const { data: profileByUserId } = await adminClient
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    if (!profileByUserId || profileByUserId.role !== 'admin') return null
    return { adminClient, userId: user.id }
  }

  if (profile.role !== 'admin') return null
  return { adminClient, userId: user.id }
}

/** GET /api/admin/support - List support tickets and categories */
export async function GET() {
  const auth = await verifyAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ticketsRes, categoriesRes] = await Promise.all([
    auth.adminClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false }),
    auth.adminClient
      .from('ticket_categories')
      .select('id, name, color')
      .eq('is_active', true),
  ])

  return NextResponse.json({
    tickets: ticketsRes.data || [],
    categories: categoriesRes.data || [],
    errors: {
      tickets: ticketsRes.error?.message || null,
      categories: categoriesRes.error?.message || null,
    },
  })
}

/** PATCH /api/admin/support - Update a support ticket */
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ticketId, updates } = await request.json()
  if (!ticketId || !updates) {
    return NextResponse.json({ error: 'ticketId and updates required' }, { status: 400 })
  }

  const { error } = await auth.adminClient
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
