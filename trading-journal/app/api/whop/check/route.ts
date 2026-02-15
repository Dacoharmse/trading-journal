import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyWhopMembership, checkMembershipByUserId } from '@/lib/whop'

/**
 * POST /api/whop/check
 * Re-checks WHOP membership for the currently authenticated user.
 * Called by auth-provider after login. Admin users are auto-approved.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch profile (try id first, then user_id for legacy schema)
    let profile = null
    const { data: profileById } = await adminClient
      .from('user_profiles')
      .select('id, email, role, whop_username, whop_user_id, is_active, is_mentor, mentor_approved')
      .eq('id', user.id)
      .single()

    if (profileById) {
      profile = profileById
    } else {
      const { data: profileByUserId } = await adminClient
        .from('user_profiles')
        .select('id, email, role, whop_username, whop_user_id, is_active, is_mentor, mentor_approved')
        .eq('user_id', user.id)
        .single()
      profile = profileByUserId
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Admin users skip WHOP checks
    if (profile.role === 'admin') {
      return NextResponse.json({
        verified: true,
        is_admin: true,
        membership_status: 'admin_exempt',
      })
    }

    // Mentor users skip WHOP checks
    if (profile.is_mentor && profile.mentor_approved) {
      return NextResponse.json({
        verified: true,
        is_mentor: true,
        membership_status: 'mentor_exempt',
      })
    }

    // Check membership
    let result

    if (profile.whop_user_id) {
      // Fast path: use stored whop_user_id
      result = await checkMembershipByUserId(profile.whop_user_id)
    } else {
      // Slow path: verify by email (matches WHOP account email)
      const email = profile.email || user.email
      if (!email) {
        return NextResponse.json(
          { verified: false, error: 'No email found for this account.' },
          { status: 403 }
        )
      }
      result = await verifyWhopMembership(email)

      // Store whop_user_id and username for future fast lookups
      if (result.whop_user_id) {
        const updateData: Record<string, string> = { whop_user_id: result.whop_user_id }
        if (result.whop_username) {
          updateData.whop_username = result.whop_username
        }
        await adminClient
          .from('user_profiles')
          .update(updateData)
          .eq('id', profile.id)
      }
    }

    // Update is_active status
    if (result.verified && !profile.is_active) {
      await adminClient
        .from('user_profiles')
        .update({
          is_active: true,
          activated_at: new Date().toISOString(),
          deactivated_at: null,
        })
        .eq('id', profile.id)
    } else if (!result.verified && profile.is_active) {
      await adminClient
        .from('user_profiles')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
    }

    if (result.verified) {
      return NextResponse.json({
        verified: true,
        membership_status: result.membership_status,
      })
    }

    return NextResponse.json(
      {
        verified: false,
        error: result.error,
        membership_status: result.membership_status,
      },
      { status: 403 }
    )
  } catch (error) {
    console.error('WHOP membership check error:', error)
    // Fail open - don't lock users out if WHOP API is down
    return NextResponse.json({
      verified: true,
      error: 'Membership check failed, granting temporary access',
      fallback: true,
    })
  }
}
