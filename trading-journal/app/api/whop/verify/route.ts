import { NextRequest, NextResponse } from 'next/server'
import { verifyWhopMembership } from '@/lib/whop'

/**
 * POST /api/whop/verify
 * Verifies an email has an active Trading Mastery membership on WHOP.
 * Called during registration before Supabase signUp.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json(
        { verified: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const result = await verifyWhopMembership(email.trim())

    if (result.verified) {
      return NextResponse.json({
        verified: true,
        whop_user_id: result.whop_user_id,
        whop_username: result.whop_username,
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
    console.error('WHOP verification error:', error)
    return NextResponse.json(
      { verified: false, error: 'Failed to verify WHOP membership. Please try again.' },
      { status: 500 }
    )
  }
}
