import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/student/dashboard — fetch all student dashboard data (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Load connected mentors via mentorship_connections
    const { data: connections, error: connError } = await admin
      .from('mentorship_connections')
      .select('mentor_id, created_at')
      .eq('student_id', user.id)
      .eq('status', 'active')

    if (connError) {
      console.error('mentorship_connections error:', connError)
      return NextResponse.json({ error: connError.message }, { status: 400 })
    }

    const mentorIds = (connections || []).map((c: any) => c.mentor_id)

    // 2. Fetch mentor profiles
    let mentors: any[] = []
    if (mentorIds.length > 0) {
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('id, user_id, full_name, email, bio')
        .in('id', mentorIds)

      // Also try user_id match in case profile uses user_id as pk
      const { data: profilesByUserId } = await admin
        .from('user_profiles')
        .select('id, user_id, full_name, email, bio')
        .in('user_id', mentorIds)

      const allProfiles = [...(profiles || []), ...(profilesByUserId || [])]
      const seen = new Set<string>()
      const uniqueProfiles = allProfiles.filter((p) => {
        const key = p.id || p.user_id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      mentors = (connections || []).map((conn: any) => {
        const profile = uniqueProfiles.find(
          (p) => p.id === conn.mentor_id || p.user_id === conn.mentor_id
        )
        return {
          id: conn.mentor_id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? '',
          bio: profile?.bio ?? null,
          connected_at: conn.created_at,
        }
      })
    }

    // 3. Shared playbooks from those mentors
    let sharedPlaybooks: any[] = []
    if (mentorIds.length > 0) {
      const { data: pbData } = await admin
        .from('shared_playbooks')
        .select('id, playbook_id, shared_note, created_at, mentor_id, shared_with, student_ids')
        .in('mentor_id', mentorIds)
        .order('created_at', { ascending: false })

      const accessible = (pbData || []).filter((pb: any) => {
        if (pb.shared_with === 'all_students') return true
        if (pb.shared_with === 'specific_students' && pb.student_ids?.includes(user.id)) return true
        return false
      })

      // Fetch playbook details
      const playbookIds = accessible.map((pb: any) => pb.playbook_id)
      let playbookDetails: any[] = []
      if (playbookIds.length > 0) {
        const { data: pbs } = await admin
          .from('playbooks')
          .select('id, name, description, category')
          .in('id', playbookIds)
        playbookDetails = pbs || []
      }

      const mentorMap = Object.fromEntries(mentors.map((m) => [m.id, m]))

      sharedPlaybooks = accessible.map((pb: any) => ({
        id: pb.id,
        playbook_id: pb.playbook_id,
        shared_note: pb.shared_note,
        created_at: pb.created_at,
        playbook: playbookDetails.find((p) => p.id === pb.playbook_id) || { name: 'Unknown', description: null, category: '' },
        mentor: { full_name: mentorMap[pb.mentor_id]?.full_name ?? null },
      }))
    }

    // 4. Published trades (visible to this student)
    const { data: tradesData } = await admin
      .from('published_trades')
      .select('id, trade_id, title, description, view_count, published_at, mentor_id, visibility, student_ids')
      .order('published_at', { ascending: false })

    const accessibleTrades = (tradesData || []).filter((trade: any) => {
      if (trade.visibility === 'public') return true
      if (trade.visibility === 'all_students' && mentorIds.includes(trade.mentor_id)) return true
      if (trade.visibility === 'specific_students' && trade.student_ids?.includes(user.id)) return true
      return false
    })

    // Fetch trade details for accessible trades
    const tradeIds = accessibleTrades.map((t: any) => t.trade_id)
    let tradeDetails: any[] = []
    if (tradeIds.length > 0) {
      const { data: tds } = await admin
        .from('trades')
        .select('id, symbol, trade_type, pnl, chart_image_url')
        .in('id', tradeIds)
      tradeDetails = tds || []
    }

    const mentorMap = Object.fromEntries(mentors.map((m) => [m.id, m]))

    const publishedTrades = accessibleTrades.map((t: any) => ({
      id: t.id,
      trade_id: t.trade_id,
      title: t.title,
      description: t.description,
      view_count: t.view_count,
      published_at: t.published_at,
      trade: tradeDetails.find((td) => td.id === t.trade_id) || { symbol: '', trade_type: 'long', pnl: 0, chart_image_url: null },
      mentor: { full_name: mentorMap[t.mentor_id]?.full_name ?? null },
    }))

    // 5. Review requests
    const { data: reviewsData } = await admin
      .from('trade_review_requests')
      .select('id, trade_id, status, created_at, mentor_id')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const reviewTradeIds = (reviewsData || []).map((r: any) => r.trade_id)
    let reviewTradeDetails: any[] = []
    if (reviewTradeIds.length > 0) {
      const { data: rtds } = await admin
        .from('trades')
        .select('id, symbol, trade_type, entry_date')
        .in('id', reviewTradeIds)
      reviewTradeDetails = rtds || []
    }

    const reviews = (reviewsData || []).map((r: any) => ({
      id: r.id,
      trade_id: r.trade_id,
      status: r.status,
      created_at: r.created_at,
      trade: reviewTradeDetails.find((t) => t.id === r.trade_id) || { symbol: '', trade_type: 'long', entry_date: '' },
      mentor: { full_name: mentorMap[r.mentor_id]?.full_name ?? null },
    }))

    return NextResponse.json({
      mentors,
      sharedPlaybooks,
      publishedTrades,
      reviews,
    })
  } catch (err) {
    console.error('GET /api/student/dashboard error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
