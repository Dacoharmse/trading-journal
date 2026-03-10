import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/student/mentors — fetch approved mentors with counts (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: mentors, error } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, avatar_url, instagram_url, bio, experience_level')
      .eq('is_mentor', true)
      .eq('mentor_approved', true)
      .neq('role', 'admin')
      .order('full_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mentorList = mentors ?? []
    if (mentorList.length === 0) return NextResponse.json({ mentors: [] })

    // Fetch counts for each mentor in parallel
    const mentorsWithCounts = await Promise.all(
      mentorList.map(async (mentor) => {
        const mentorId = mentor.id

        const [tradesRes, studentsRes, playbooksRes] = await Promise.all([
          admin
            .from('published_trades')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', mentorId),
          admin
            .from('mentor_relationships')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', mentorId)
            .eq('status', 'accepted'),
          admin
            .from('shared_playbooks')
            .select('id', { count: 'exact', head: true })
            .eq('mentor_id', mentorId),
        ])

        return {
          ...mentor,
          publishedTradesCount: tradesRes.count ?? 0,
          studentsCount: studentsRes.count ?? 0,
          sharedPlaybooksCount: playbooksRes.count ?? 0,
        }
      })
    )

    return NextResponse.json({ mentors: mentorsWithCounts })
  } catch (err) {
    console.error('GET /api/student/mentors error:', err)
    return NextResponse.json({ error: 'Failed to load mentors' }, { status: 500 })
  }
}
