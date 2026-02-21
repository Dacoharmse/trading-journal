import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/mentor/dashboard — fetch all mentor dashboard data (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify caller is mentor or admin
    let callerProfile: any = null
    const { data: profileById } = await admin
      .from('user_profiles')
      .select('id, user_id, role, is_mentor, mentor_approved, mentor_rating, mentor_total_reviews')
      .eq('id', user.id)
      .single()

    callerProfile = profileById

    if (!callerProfile) {
      const { data: profileByUserId } = await admin
        .from('user_profiles')
        .select('id, user_id, role, is_mentor, mentor_approved, mentor_rating, mentor_total_reviews')
        .eq('user_id', user.id)
        .single()
      callerProfile = profileByUserId
    }

    if (!callerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isAdmin = callerProfile.role === 'admin'
    const isMentor = callerProfile.is_mentor && callerProfile.mentor_approved

    if (!isAdmin && !isMentor) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Use the profile id (the row id, not necessarily auth user id)
    const mentorId = callerProfile.id

    // 1. All trader-role users are students
    const { data: allStudents, error: studentsError } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, avatar_url, created_at')
      .eq('role', 'trader')
      .order('created_at', { ascending: false })

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError)
    }

    const students = allStudents || []

    // 2. Shared playbooks count for this mentor
    const { count: playbooksCount } = await admin
      .from('shared_playbooks')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', mentorId)

    // 3. Published trades count for this mentor
    const { count: tradesCount } = await admin
      .from('published_trades')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', mentorId)

    // 4. Load trade stats for each student (up to 50 trades each)
    const studentIds = students.map((s: any) => s.user_id || s.id)

    let allTrades: any[] = []
    if (studentIds.length > 0) {
      const { data: tradesData } = await admin
        .from('trades')
        .select('id, user_id, pnl, entry_date')
        .in('user_id', studentIds)
        .order('entry_date', { ascending: false })

      allTrades = tradesData || []
    }

    // Build student progress data
    const studentProgress = students.map((student: any) => {
      const authId = student.user_id || student.id
      const studentTrades = allTrades.filter((t: any) => t.user_id === authId)
      const closedTrades = studentTrades.filter((t: any) => t.pnl !== null)
      const winningTrades = closedTrades.filter((t: any) => t.pnl > 0)
      const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

      const recentTrades = closedTrades.slice(0, 10)
      const recentPnl = recentTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
      const trend: 'up' | 'down' | 'stable' = recentPnl > 50 ? 'up' : recentPnl < -50 ? 'down' : 'stable'

      const lastTradeDate = studentTrades[0]?.entry_date || null
      const daysSinceLastTrade = lastTradeDate
        ? Math.floor((Date.now() - new Date(lastTradeDate + 'T00:00').getTime()) / (1000 * 60 * 60 * 24))
        : null
      // Only flag inactivity if student has traded before and gone quiet (7+ days)
      // Never flag new traders with 0 trades — they just haven't started yet
      const needsAttention =
        (studentTrades.length > 0 && daysSinceLastTrade !== null && daysSinceLastTrade > 7) ||
        (winRate < 40 && closedTrades.length >= 5)

      return {
        id: student.id,
        student_id: authId,
        full_name: student.full_name || null,
        email: student.email || '',
        avatar_url: student.avatar_url || null,
        connected_at: student.created_at,
        total_trades: studentTrades.length,
        win_rate: winRate,
        total_pnl: totalPnl,
        last_trade_date: lastTradeDate,
        needs_attention: needsAttention,
        trend,
      }
    })

    return NextResponse.json({
      stats: {
        totalStudents: students.length,
        activeStudents: students.length,
        sharedPlaybooks: playbooksCount || 0,
        publishedTrades: tradesCount || 0,
        averageRating: callerProfile.mentor_rating || 0,
        totalReviews: callerProfile.mentor_total_reviews || 0,
      },
      studentProgress,
    })
  } catch (err) {
    console.error('GET /api/mentor/dashboard error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
