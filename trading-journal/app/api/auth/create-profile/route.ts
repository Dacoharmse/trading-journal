import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/create-profile
 * Creates a user profile after registration. Uses admin client to bypass RLS.
 * The caller must be authenticated (just signed up).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    const adminClient = createAdminClient()

    // Check if profile already exists
    const { data: existing } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      // Auto-confirm email for existing profiles too (in case it wasn't confirmed)
      try {
        await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })
      } catch {
        // Non-critical
      }
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // Also check by user_id for legacy schema
    const { data: existingByUserId } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingByUserId) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })
      } catch {
        // Non-critical
      }
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    const { error: insertError } = await adminClient
      .from('user_profiles')
      .insert({
        id: user.id,
        user_id: user.id,
        email: user.email,
        full_name: body.full_name || null,
        whop_username: body.whop_username || null,
        whop_user_id: body.whop_user_id || null,
        is_active: true,
        activated_at: new Date().toISOString(),
        experience_level: body.experience_level || 'beginner',
        years_of_experience: body.years_of_experience || null,
        trading_style: body.trading_style || 'day_trading',
        email_notifications: true,
        subscription_tier: 'free',
        items_per_page: 50,
        role: 'trader',
      })

    if (insertError) {
      console.error('Profile creation error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Auto-confirm email so user can log in immediately without email verification
    try {
      await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })
    } catch (confirmError) {
      console.error('Email confirmation error:', confirmError)
      // Non-critical - user can still be confirmed manually by admin
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Create profile error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
