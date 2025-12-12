import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/confirm-email
 * Confirms a user's email using service role (bypasses email verification)
 */
export async function POST(request: Request) {
  try {
    // Create server client (reads auth from cookies)
    const supabase = await createClient()

    // Get current user and verify they're admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Unauthorized - Not logged in',
        details: userError?.message
      }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        error: 'Failed to verify admin role',
        details: profileError?.message
      }, { status: 500 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Get userId and email from request body
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 })
    }

    // Create admin client with service role (bypasses RLS)
    const adminClient = createAdminClient()

    // Update user's email confirmation status using admin API
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true
    })

    if (error) {
      console.error('Error confirming email:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
      user: data.user
    })

  } catch (error) {
    console.error('Confirm email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
