import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/admin/migrate-size-column
// Adds size NUMERIC(12,4) column to trades table if it doesn't exist yet.
// Safe to call multiple times (IF NOT EXISTS).
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Run the migration using the admin client's rpc to execute raw SQL
    const { error } = await admin.rpc('exec_sql', {
      sql: 'ALTER TABLE trades ADD COLUMN IF NOT EXISTS size NUMERIC(12, 4);',
    })

    if (error) {
      // exec_sql may not exist — that's OK, surface the error so the user
      // knows they need to run the SQL manually in the Supabase dashboard.
      console.error('Migration error:', error)
      return NextResponse.json({
        error: error.message,
        manual_sql: 'ALTER TABLE trades ADD COLUMN IF NOT EXISTS size NUMERIC(12, 4);',
        instruction: 'Run the manual_sql above in your Supabase SQL editor.',
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'size column added (or already existed)' })
  } catch (err) {
    console.error('migrate-size-column error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Migration failed',
      manual_sql: 'ALTER TABLE trades ADD COLUMN IF NOT EXISTS size NUMERIC(12, 4);',
      instruction: 'Run the manual_sql above in your Supabase SQL editor.',
    }, { status: 500 })
  }
}
