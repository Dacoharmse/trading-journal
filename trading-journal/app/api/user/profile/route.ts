import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/user/profile
 * Returns the current user's profile using service role (bypasses RLS)
 */
export async function GET() {
  try {
    // Get the authenticated user from cookies
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Try by id first
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      return NextResponse.json({ profile })
    }

    // Fallback: try by user_id
    const { data: profileByUserId } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ profile: profileByUserId || null })
  } catch {
    return NextResponse.json({ profile: null }, { status: 200 })
  }
}
