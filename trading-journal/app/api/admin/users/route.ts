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

/** GET /api/admin/users - List all user profiles */
export async function GET() {
  const auth = await verifyAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await auth.adminClient
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data || [] })
}

/** PATCH /api/admin/users - Update a user profile */
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, updates } = await request.json()
  if (!userId || !updates) {
    return NextResponse.json({ error: 'userId and updates required' }, { status: 400 })
  }

  // Try updating by id first, then by user_id (dual-schema support)
  const { data: byId, error: err1 } = await auth.adminClient
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select('id')

  if (err1) {
    console.error('Update by id failed:', err1)
    return NextResponse.json({ error: err1.message }, { status: 500 })
  }

  // If no rows matched by id, try user_id
  if (!byId || byId.length === 0) {
    const { data: byUserId, error: err2 } = await auth.adminClient
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select('id')

    if (err2) {
      console.error('Update by user_id failed:', err2)
      return NextResponse.json({ error: err2.message }, { status: 500 })
    }

    if (!byUserId || byUserId.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
  }

  return NextResponse.json({ success: true })
}
