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

  const { error } = await auth.adminClient
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
