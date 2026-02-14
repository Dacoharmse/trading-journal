import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/delete-user
 * Deletes a user and all related data using service role (bypasses RLS)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to verify role (bypasses RLS)
    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Delete related data in order (using service role)

    // Delete notifications
    await adminClient.from('notifications').delete().eq('user_id', userId)

    // Delete trade reviews (as trader or mentor)
    await adminClient.from('trade_reviews').delete().eq('trader_id', userId)
    await adminClient.from('trade_reviews').delete().eq('mentor_id', userId)

    // Delete mentor relationships
    await adminClient.from('mentor_relationships').delete().eq('student_id', userId)
    await adminClient.from('mentor_relationships').delete().eq('mentor_id', userId)

    // Delete shared playbooks
    await adminClient.from('shared_playbooks').delete().eq('mentor_id', userId)

    // Delete published trades
    await adminClient.from('published_trades').delete().eq('mentor_id', userId)

    // Delete trades
    await adminClient.from('trades').delete().eq('user_id', userId)

    // Delete playbooks
    await adminClient.from('playbooks').delete().eq('user_id', userId)

    // Delete accounts
    await adminClient.from('accounts').delete().eq('user_id', userId)

    // Delete admin audit logs
    await adminClient.from('admin_audit_log').delete().eq('admin_id', userId)
    await adminClient.from('admin_audit_log').delete().eq('target_user_id', userId)

    // Finally, delete user profile
    const { error: deleteError, data } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', userId)
      .select()

    if (deleteError) {
      console.error('Error deleting user profile:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User and all related data deleted successfully',
      deletedUser: data[0]
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
