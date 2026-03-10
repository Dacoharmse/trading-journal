import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getMentorOrAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, is_mentor, mentor_approved, full_name')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle()

  if (!profile) return null
  const isAdmin = profile.role === 'admin'
  const isMentor = profile.is_mentor && profile.mentor_approved
  if (!isAdmin && !isMentor) return null

  return { user, profile }
}

// GET /api/mentor/playbook-comments?playbook_id=<id>
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await getMentorOrAdmin(supabase)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const playbookId = request.nextUrl.searchParams.get('playbook_id')
    if (!playbookId) return NextResponse.json({ error: 'playbook_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('playbook_comments')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('created_at', { ascending: true })

    if (error) {
      // Table may not exist yet — return empty list gracefully
      if (error.code === '42P01') return NextResponse.json({ comments: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

// POST /api/mentor/playbook-comments
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await getMentorOrAdmin(supabase)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { playbook_id, comment } = await request.json()
    if (!playbook_id || !comment?.trim()) {
      return NextResponse.json({ error: 'playbook_id and comment required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('playbook_comments')
      .insert({
        playbook_id,
        author_id: auth.user.id,
        author_name: auth.profile.full_name || 'Mentor',
        comment: comment.trim(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ comment: data })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 })
  }
}

// DELETE /api/mentor/playbook-comments
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await getMentorOrAdmin(supabase)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { comment_id } = await request.json()
    if (!comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('playbook_comments')
      .delete()
      .eq('id', comment_id)
      .eq('author_id', auth.user.id) // can only delete own comments

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
