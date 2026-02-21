/**
 * POST /api/notifications/send
 *
 * Triggers a notification email for the currently authenticated user (or any
 * user when called with the internal CRON_SECRET for scheduled tasks).
 *
 * Body shape:
 * {
 *   type: 'daily_summary' | 'weekly_report' | 'profit_target' | 'drawdown_warning' |
 *         'daily_loss_limit' | 'trade_reminder' | 'winning_streak' | 'personal_best' | 'milestone',
 *   // type-specific payload fields
 * }
 *
 * Scheduled (cron) calls supply: { cronSecret: process.env.CRON_SECRET, userId, type, ...payload }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendDailySummaryEmail,
  sendWeeklyReportEmail,
  sendProfitTargetEmail,
  sendDrawdownWarningEmail,
  sendDailyLossLimitEmail,
  sendTradeReminderEmail,
  sendWinningStreakEmail,
  sendPersonalBestEmail,
  sendMilestoneEmail,
  type NotificationPrefs,
} from '@/lib/notification-mailer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserAndPrefs(userId: string) {
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, email_notifications, daily_summary_email, weekly_report_email, profit_target_alerts, drawdown_warnings, daily_loss_alerts, trade_reminders, winning_streak_notifications, personal_best_notifications, milestone_notifications')
    .eq('user_id', userId)
    .single()

  const { data: authUser } = await supabase.auth.admin.getUserById(userId)

  return {
    email: authUser?.user?.email ?? '',
    name: profile?.full_name || 'Trader',
    prefs: (profile ?? {}) as NotificationPrefs,
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, cronSecret, userId: cronUserId, ...payload } = body

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    // Determine the user — either from auth session or cron secret
    let userId: string

    if (cronSecret) {
      // Scheduled / server-to-server call
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (!cronUserId) {
        return NextResponse.json({ error: 'userId required for cron calls' }, { status: 400 })
      }
      userId = cronUserId
    } else {
      // Authenticated user call
      const supabase = createAdminClient()
      const authHeader = request.headers.get('authorization') ?? ''
      const token = authHeader.replace('Bearer ', '')

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const { email, name, prefs } = await getUserAndPrefs(userId)

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Master guard — all other preference checks happen inside each send function
    if (!prefs.email_notifications) {
      return NextResponse.json({ skipped: true, reason: 'email_notifications disabled' })
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────
    switch (type) {
      case 'daily_summary':
        await sendDailySummaryEmail({ email, name, prefs, ...payload })
        break

      case 'weekly_report':
        await sendWeeklyReportEmail({ email, name, prefs, ...payload })
        break

      case 'profit_target':
        await sendProfitTargetEmail({ email, name, prefs, ...payload })
        break

      case 'drawdown_warning':
        await sendDrawdownWarningEmail({ email, name, prefs, ...payload })
        break

      case 'daily_loss_limit':
        await sendDailyLossLimitEmail({ email, name, prefs, ...payload })
        break

      case 'trade_reminder':
        await sendTradeReminderEmail({ email, name, prefs, ...payload })
        break

      case 'winning_streak':
        await sendWinningStreakEmail({ email, name, prefs, ...payload })
        break

      case 'personal_best':
        await sendPersonalBestEmail({ email, name, prefs, ...payload })
        break

      case 'milestone':
        await sendMilestoneEmail({ email, name, prefs, ...payload })
        break

      default:
        return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, type })
  } catch (err: any) {
    console.error('[notifications/send] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
