import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/auto-confirm
 * Auto-confirms a user's email and creates their profile after registration.
 * Called from the registration page with the userId from signUp response.
 * Does NOT require cookie-based auth (uses userId from request body).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, profileData } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Auto-confirm email
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (error) {
      console.error('Auto-confirm email error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create user profile if profileData is provided
    if (profileData) {
      // Check if profile already exists
      const { data: existing } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (!existing) {
        const { error: profileError } = await adminClient
          .from('user_profiles')
          .insert({
            id: userId,
            user_id: userId,
            email: email || null,
            full_name: profileData.full_name || null,
            whop_username: profileData.whop_username || null,
            whop_user_id: profileData.whop_user_id || null,
            is_active: true,
            activated_at: new Date().toISOString(),
            experience_level: profileData.experience_level || 'beginner',
            years_of_experience: profileData.years_of_experience || null,
            trading_style: profileData.trading_style || 'day_trading',
            email_notifications: true,
            subscription_tier: 'free',
            items_per_page: 50,
            role: 'trader',
          })

        if (profileError) {
          console.error('Profile creation error during auto-confirm:', profileError)
          // Don't fail the whole request - email is confirmed, profile can be retried
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auto-confirm error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
