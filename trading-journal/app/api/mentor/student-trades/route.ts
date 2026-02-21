import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/mentor/student-trades?userId=xxx — fetch a student's trades (bypasses RLS)
export async function GET(req: NextRequest) {
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
      .select('role, is_mentor, mentor_approved')
      .eq('id', user.id)
      .single()
    callerProfile = profileById

    if (!callerProfile) {
      const { data: profileByUserId } = await admin
        .from('user_profiles')
        .select('role, is_mentor, mentor_approved')
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

    const studentUserId = req.nextUrl.searchParams.get('userId')
    if (!studentUserId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Fetch student profile
    let studentProfile: any = null
    const { data: sp1 } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, avatar_url, experience_level, years_of_experience, trading_style')
      .eq('user_id', studentUserId)
      .single()
    studentProfile = sp1

    if (!studentProfile) {
      const { data: sp2 } = await admin
        .from('user_profiles')
        .select('id, user_id, full_name, email, avatar_url, experience_level, years_of_experience, trading_style')
        .eq('id', studentUserId)
        .single()
      studentProfile = sp2
    }

    // Fetch student's trades
    const { data: trades, error: tradesError } = await admin
      .from('trades')
      .select('*')
      .eq('user_id', studentUserId)
      .order('entry_date', { ascending: false })

    if (tradesError) {
      console.error('Failed to fetch student trades:', tradesError)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    return NextResponse.json({ studentProfile, trades: trades || [] })
  } catch (err) {
    console.error('GET /api/mentor/student-trades error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
