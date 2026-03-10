import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/student/shared-playbooks — fetch shared playbooks accessible to this student
// Optional ?playbook_id=<id> to fetch rules+confluences for a specific playbook
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const playbookId = request.nextUrl.searchParams.get('playbook_id')

    // Fetch rules + confluences for a specific playbook
    if (playbookId) {
      const [rulesRes, confluencesRes] = await Promise.all([
        admin
          .from('playbook_rules')
          .select('id, label, type, weight, sort')
          .eq('playbook_id', playbookId)
          .order('sort', { ascending: true }),
        admin
          .from('playbook_confluences')
          .select('id, label, weight, sort')
          .eq('playbook_id', playbookId)
          .order('sort', { ascending: true }),
      ])

      return NextResponse.json({
        rules: rulesRes.data ?? [],
        confluences: confluencesRes.data ?? [],
      })
    }

    // Fetch all shared playbooks
    const { data, error } = await admin
      .from('shared_playbooks')
      .select(`
        id,
        playbook_id,
        mentor_id,
        shared_with,
        student_ids,
        shared_note,
        created_at,
        playbook:playbook_id (
          id,
          name,
          description,
          category,
          active,
          created_at
        ),
        mentor:mentor_id (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ playbooks: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter: all_students OR specific_students where user is included
    const playbooks = (data ?? []).filter((pb: any) => {
      if (pb.shared_with === 'all_students') return true
      if (pb.shared_with === 'specific_students' && pb.student_ids?.includes(user.id)) return true
      return false
    })

    return NextResponse.json({ playbooks })
  } catch (err) {
    console.error('GET /api/student/shared-playbooks error:', err)
    return NextResponse.json({ error: 'Failed to load shared playbooks' }, { status: 500 })
  }
}
