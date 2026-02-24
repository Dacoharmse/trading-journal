import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/trades/bulk — insert multiple trades at once (bypasses RLS)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { trades } = await request.json()

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'No trades provided' }, { status: 400 })
    }

    // Force user_id on every row so users can't insert trades for other users
    const payload = trades.map((t: Record<string, unknown>) => ({
      ...t,
      user_id: session.user.id,
    }))

    const admin = createAdminClient()

    // Insert in chunks of 200 to stay within PostgREST limits
    const CHUNK_SIZE = 200
    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE)
      const { data, error } = await admin.from('trades').insert(chunk).select('id')

      if (error) {
        // If size column missing from cache, strip it and retry
        if (error.message.includes('Could not find the') && error.message.includes('in the schema cache')) {
          const match = error.message.match(/Could not find the '(\w+)' column/)
          if (match) {
            const col = match[1]
            const stripped = chunk.map(({ [col]: _removed, ...rest }) => rest)
            const { data: retryData, error: retryError } = await admin.from('trades').insert(stripped).select('id')
            if (retryError) {
              errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${retryError.message}`)
            } else {
              inserted += retryData?.length ?? 0
            }
            continue
          }
        }
        errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`)
      } else {
        inserted += data?.length ?? 0
      }
    }

    return NextResponse.json({
      inserted,
      failed: payload.length - inserted,
      errors,
    })
  } catch (err) {
    console.error('POST /api/trades/bulk error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bulk import failed' },
      { status: 500 }
    )
  }
}
