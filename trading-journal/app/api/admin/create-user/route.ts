import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/create-user
 * Manually creates a user account (bypasses WHOP verification and email confirmation).
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin role
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { email, password, fullName, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Create the auth user via admin API (auto-confirms email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
      },
    })

    if (createError) {
      console.error('Create user error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create user profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        user_id: newUser.user.id,
        email: email,
        full_name: fullName || null,
        is_active: true,
        activated_at: new Date().toISOString(),
        experience_level: 'beginner',
        trading_style: 'day_trading',
        email_notifications: true,
        subscription_tier: 'free',
        items_per_page: 50,
        role: role || 'trader',
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // User was created in auth but profile failed - still return success with warning
      return NextResponse.json({
        success: true,
        warning: 'User created but profile creation failed: ' + profileError.message,
        user: { id: newUser.user.id, email },
      })
    }

    return NextResponse.json({
      success: true,
      user: { id: newUser.user.id, email, full_name: fullName },
    })
  } catch (error) {
    console.error('Admin create user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
