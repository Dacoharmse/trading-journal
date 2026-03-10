import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/mentor/playbook-analysis
// Returns all students with their playbooks (for mentor/admin review)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Verify mentor or admin
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role, is_mentor, mentor_approved')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = profile.role === 'admin'
    const isMentor = profile.is_mentor && profile.mentor_approved
    if (!isAdmin && !isMentor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch all students (traders)
    const { data: students, error: studentsError } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, avatar_url, experience_level')
      .eq('role', 'trader')
      .order('full_name', { ascending: true })

    if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 })

    // Fetch all student playbooks in one query
    const studentUserIds = (students ?? [])
      .map((s) => s.user_id || s.id)
      .filter(Boolean)

    const { data: playbooks, error: playbooksError } = await admin
      .from('playbooks')
      .select('id, user_id, name, description, category, active, created_at, updated_at')
      .in('user_id', studentUserIds.length > 0 ? studentUserIds : ['00000000-0000-0000-0000-000000000000'])
      .order('updated_at', { ascending: false })

    if (playbooksError) return NextResponse.json({ error: playbooksError.message }, { status: 500 })

    // Fetch comment counts per playbook
    const playbookIds = (playbooks ?? []).map((p) => p.id)
    let commentCounts: Record<string, number> = {}
    if (playbookIds.length > 0) {
      const { data: counts } = await admin
        .from('playbook_comments')
        .select('playbook_id')
        .in('playbook_id', playbookIds)

      if (counts) {
        counts.forEach((c) => {
          commentCounts[c.playbook_id] = (commentCounts[c.playbook_id] ?? 0) + 1
        })
      }
    }

    // Group playbooks by student
    const playbooksByStudent: Record<string, typeof playbooks> = {}
    ;(playbooks ?? []).forEach((pb) => {
      const key = pb.user_id
      if (!playbooksByStudent[key]) playbooksByStudent[key] = []
      playbooksByStudent[key].push({ ...pb, comment_count: commentCounts[pb.id] ?? 0 } as any)
    })

    const result = (students ?? [])
      .map((s) => {
        const uid = s.user_id || s.id
        return {
          ...s,
          playbooks: playbooksByStudent[uid] ?? [],
        }
      })
      .filter((s) => s.playbooks.length > 0) // only show students who have playbooks

    return NextResponse.json({ students: result })
  } catch (err) {
    console.error('GET /api/mentor/playbook-analysis error:', err)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
