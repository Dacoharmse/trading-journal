import { NextRequest, NextResponse } from 'next/server'
import { verifyWhopMembership } from '@/lib/whop'

/**
 * POST /api/whop/verify
 * Verifies a WHOP username has an active Trading Mastery membership.
 * Called during registration before Supabase signUp.
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { verified: false, error: 'WHOP username is required' },
        { status: 400 }
      )
    }

    const result = await verifyWhopMembership(username.trim())

    if (result.verified) {
      return NextResponse.json({
        verified: true,
        whop_user_id: result.whop_user_id,
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
