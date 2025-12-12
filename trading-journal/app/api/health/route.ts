import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from('accounts').select('id').limit(1)

    const dbStatus = error ? 'unhealthy' : 'healthy'
    const responseTime = Date.now() - startTime

    const healthData = {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          responseTime: `${responseTime}ms`,
          ...(error && { error: error.message })
        }
      }
    }

    return NextResponse.json(healthData, {
      status: dbStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
