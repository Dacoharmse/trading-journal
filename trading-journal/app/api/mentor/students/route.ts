import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/mentor/students
 * Returns all users with the 'trader' role (bypasses RLS)
 * Only accessible by mentors and admins
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify caller is mentor or admin
    let profile = null
    const { data: profileById } = await adminClient
      .from('user_profiles')
      .select('role, is_mentor, mentor_approved')
      .eq('id', user.id)
      .single()

    profile = profileById

    if (!profile) {
      const { data: profileByUserId } = await adminClient
        .from('user_profiles')
        .select('role, is_mentor, mentor_approved')
        .eq('user_id', user.id)
        .single()
      profile = profileByUserId
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isAdmin = profile.role === 'admin'
    const isMentor = profile.is_mentor && profile.mentor_approved

    if (!isAdmin && !isMentor) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch all users with trader role
    const { data: traders, error } = await adminClient
      .from('user_profiles')
      .select('id, user_id, full_name, email, avatar_url, experience_level, years_of_experience, trading_style, created_at')
      .eq('role', 'trader')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch traders:', error)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    return NextResponse.json({ students: traders || [] })
  } catch (error) {
    console.error('Error in /api/mentor/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
