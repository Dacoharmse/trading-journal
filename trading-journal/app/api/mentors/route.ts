import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/mentors — fetch all approved mentors (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('is_mentor', true)
      .eq('mentor_approved', true)
      .order('full_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mentors: data || [] })
  } catch (err) {
    console.error('GET /api/mentors error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch mentors' },
      { status: 500 }
    )
  }
}
