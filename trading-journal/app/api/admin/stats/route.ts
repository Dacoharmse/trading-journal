import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/** GET /api/admin/stats - Dashboard statistics */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Verify admin role
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    const { data: profileByUserId } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (!profileByUserId || profileByUserId.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalUsers, activeMentors, totalTrades, newUsersWeek, newUsersMonth] = await Promise.all([
    adminClient.from('user_profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('is_mentor', true).eq('mentor_approved', true),
    adminClient.from('trades').select('id', { count: 'exact', head: true }),
    adminClient.from('user_profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    adminClient.from('user_profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', monthAgo),
  ])

  return NextResponse.json({
    totalUsers: totalUsers.count || 0,
    activeMentors: activeMentors.count || 0,
    totalTrades: totalTrades.count || 0,
    supportTickets: 0,
    newUsersThisWeek: newUsersWeek.count || 0,
    newUsersThisMonth: newUsersMonth.count || 0,
  })
}
