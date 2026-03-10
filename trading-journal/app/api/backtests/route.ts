import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/backtests — fetch playbooks + backtests for the authenticated user (bypasses RLS)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const [playbooksRes, backtestsRes] = await Promise.all([
      admin.from('playbooks').select('id, name, trade_type, active').eq('user_id', user.id),
      admin.from('backtests').select('*').eq('user_id', user.id),
    ])

    if (playbooksRes.error) return NextResponse.json({ error: playbooksRes.error.message }, { status: 500 })

    return NextResponse.json({
      playbooks: playbooksRes.data ?? [],
      backtests: backtestsRes.data ?? [],
    })
  } catch (err) {
    console.error('GET /api/backtests error:', err)
    return NextResponse.json({ error: 'Failed to load backtests' }, { status: 500 })
  }
}

// DELETE /api/backtests?playbook_id=<id> — delete all backtests for a playbook
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const playbookId = request.nextUrl.searchParams.get('playbook_id')
    if (!playbookId) return NextResponse.json({ error: 'playbook_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { error } = await admin
      .from('backtests')
      .delete()
      .eq('playbook_id', playbookId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/backtests error:', err)
    return NextResponse.json({ error: 'Failed to delete backtests' }, { status: 500 })
  }
}
