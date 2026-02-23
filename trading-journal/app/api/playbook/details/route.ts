import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/playbook/details?playbook_id=<id>
// Returns rules, confluences, and rubric for a playbook (bypasses RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playbookId = searchParams.get('playbook_id')

    if (!playbookId) {
      return NextResponse.json({ error: 'playbook_id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const [rulesRes, confRes, rubricRes] = await Promise.all([
      admin.from('playbook_rules').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_confluences').select('*').eq('playbook_id', playbookId).order('sort'),
      admin.from('playbook_rubric').select('*').eq('playbook_id', playbookId).maybeSingle(),
    ])

    return NextResponse.json({
      rules: rulesRes.data ?? [],
      confluences: confRes.data ?? [],
      rubric: rubricRes.data ?? null,
    })
  } catch (err) {
    console.error('GET /api/playbook/details error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch playbook details' },
      { status: 500 }
    )
  }
}
