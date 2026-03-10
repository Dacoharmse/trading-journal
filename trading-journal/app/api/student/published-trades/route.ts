import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/student/published-trades — fetch published trades accessible to this student
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('published_trades')
      .select(`
        id,
        trade_id,
        mentor_id,
        title,
        description,
        lessons_learned,
        tags,
        visibility,
        student_ids,
        view_count,
        published_at,
        trade:trade_id (
          id,
          symbol,
          trade_type,
          entry_date,
          exit_date,
          entry_price,
          exit_price,
          quantity,
          pnl,
          chart_image_url,
          notes,
          strategy
        ),
        mentor:mentor_id (
          id,
          full_name,
          email
        )
      `)
      .order('published_at', { ascending: false })

    if (error) {
      // Table doesn't exist yet — return empty gracefully
      if (error.code === '42P01') return NextResponse.json({ trades: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter: public trades OR specific_students where user is included
    const trades = (data ?? []).filter((t: any) => {
      if (t.visibility === 'public') return true
      if (t.visibility === 'all_students') return true
      if (t.visibility === 'specific_students' && t.student_ids?.includes(user.id)) return true
      return false
    })

    return NextResponse.json({ trades })
  } catch (err) {
    console.error('GET /api/student/published-trades error:', err)
    return NextResponse.json({ error: 'Failed to load published trades' }, { status: 500 })
  }
}

// PATCH /api/student/published-trades — increment view count
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, view_count } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('published_trades')
      .update({ view_count })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/student/published-trades error:', err)
    return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 })
  }
}
