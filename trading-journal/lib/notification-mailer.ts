/**
 * Notification Mailer
 * Sends all user notification emails via nodemailer.
 * Each function checks the relevant user preference before sending.
 */

import nodemailer from 'nodemailer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  email_notifications?: boolean
  daily_summary_email?: boolean
  weekly_report_email?: boolean
  profit_target_alerts?: boolean
  drawdown_warnings?: boolean
  daily_loss_alerts?: boolean
  trade_reminders?: boolean
  winning_streak_notifications?: boolean
  personal_best_notifications?: boolean
  milestone_notifications?: boolean
}

// ─── Transporter ──────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.2gs-trading.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'no-reply@2gs-trading.com',
      pass: process.env.SMTP_PASS || 'no-reply@2gs-trading2026',
    },
  })
}

const FROM = '"2GS Trading" <no-reply@2gs-trading.com>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://journal.2gs-trading.com'

// ─── Shared HTML Helpers ──────────────────────────────────────────────────────

function emailWrapper(body: string): string {
  const year = new Date().getFullYear()
  const logoUrl = `${SITE_URL}/2gs-dark-logo.png`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0c0a1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0c0a1a;">
    <tr>
      <td align="center" style="padding:40px 16px 20px 16px;">
        <!-- Logo -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <img src="${logoUrl}" alt="2GS Trading" width="200" style="display:block;max-width:200px;height:auto;" />
            </td>
          </tr>
        </table>
        <!-- Main Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#13111f;border-radius:12px;border:1px solid #1e1b36;">
          <tr><td style="background-color:#7c3aed;height:4px;font-size:0;line-height:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
          ${body}
        </table>
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:24px 48px 10px 48px;text-align:center;">
              <p style="margin:0 0 6px 0;color:#3d3a52;font-size:12px;">
                You received this because you have notifications enabled in your <a href="${SITE_URL}/settings" style="color:#7c3aed;text-decoration:none;">settings</a>.
              </p>
              <p style="margin:0;color:#2a2841;font-size:11px;">&copy; ${year} 2GS Trading &bull; All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function heroSection(icon: string, label: string, title: string, subtitle: string): string {
  return `
  <tr>
    <td style="padding:40px 48px 28px 48px;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:36px;line-height:1;">${icon}</p>
      <p style="margin:0 0 8px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;">${label}</p>
      <h1 style="margin:0 0 12px 0;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">${title}</h1>
      <p style="margin:0 auto;color:#8b8a9e;font-size:15px;line-height:1.7;max-width:420px;">${subtitle}</p>
    </td>
  </tr>`
}

function ctaButton(text: string, href: string): string {
  return `
  <tr>
    <td align="center" style="padding:0 48px 36px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:#7c3aed;border-radius:8px;">
            <a href="${href}" style="display:inline-block;padding:13px 40px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.4px;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function separator(): string {
  return `<tr><td style="padding:0 48px;"><div style="height:1px;background-color:#1e1b36;"></div></td></tr>`
}

function statRow(items: { label: string; value: string; color?: string }[]): string {
  const cols = items.map(item => `
    <td style="width:${100 / items.length}%;text-align:center;padding:20px 12px;background-color:#19162b;border-radius:8px;">
      <p style="margin:0 0 4px 0;color:${item.color || '#7c3aed'};font-size:22px;font-weight:700;">${item.value}</p>
      <p style="margin:0;color:#6b6980;font-size:12px;">${item.label}</p>
    </td>`).join('<td style="width:8px;"></td>')
  return `
  <tr>
    <td style="padding:0 48px 28px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>${cols}</tr>
      </table>
    </td>
  </tr>`
}

function infoBox(content: string, accentColor = '#7c3aed'): string {
  return `
  <tr>
    <td style="padding:0 48px 32px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:#19162b;border-left:3px solid ${accentColor};border-radius:8px;padding:20px 24px;">
            ${content}
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ─── 1. Daily Summary ─────────────────────────────────────────────────────────

export interface DailySummaryParams {
  email: string
  name: string
  prefs: NotificationPrefs
  date: string          // e.g. "21 Feb 2026"
  totalTrades: number
  wins: number
  losses: number
  netPnL: number        // raw number
  currency: string
  bestTrade: string     // e.g. "XAUUSD +$120"
  worstTrade: string    // e.g. "EURUSD -$45"
}

export async function sendDailySummaryEmail(p: DailySummaryParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.daily_summary_email) return

  const pnlColor = p.netPnL >= 0 ? '#22c55e' : '#ef4444'
  const pnlStr = `${p.netPnL >= 0 ? '+' : ''}${p.currency}${Math.abs(p.netPnL).toFixed(2)}`
  const winRate = p.totalTrades > 0 ? Math.round((p.wins / p.totalTrades) * 100) : 0

  const html = emailWrapper(`
    ${heroSection('📊', 'Daily Summary', `Trading Summary — ${p.date}`, `Here's how your trading day went, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: 'Net P&L', value: pnlStr, color: pnlColor },
      { label: 'Trades', value: String(p.totalTrades) },
      { label: 'Win Rate', value: `${winRate}%`, color: '#9b8aff' },
    ])}
    ${separator()}
    ${infoBox(`
      <p style="margin:0 0 10px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Highlights</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Best trade</td>
          <td style="padding:6px 0;color:#22c55e;font-size:13px;font-weight:600;text-align:right;">${p.bestTrade}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Worst trade</td>
          <td style="padding:6px 0;color:#ef4444;font-size:13px;font-weight:600;text-align:right;">${p.worstTrade}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Wins / Losses</td>
          <td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">${p.wins}W / ${p.losses}L</td>
        </tr>
      </table>
    `)}
    ${ctaButton('View Full Journal', `${SITE_URL}/trades`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `Your Trading Summary — ${p.date}`, html })
}

// ─── 2. Weekly Report ─────────────────────────────────────────────────────────

export interface WeeklyReportParams {
  email: string
  name: string
  prefs: NotificationPrefs
  weekLabel: string       // e.g. "17–21 Feb 2026"
  totalTrades: number
  wins: number
  losses: number
  netPnL: number
  currency: string
  bestDay: string         // e.g. "Thursday +$200"
  topSetup: string        // e.g. "Break & Retest (8 trades)"
}

export async function sendWeeklyReportEmail(p: WeeklyReportParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.weekly_report_email) return

  const pnlColor = p.netPnL >= 0 ? '#22c55e' : '#ef4444'
  const pnlStr = `${p.netPnL >= 0 ? '+' : ''}${p.currency}${Math.abs(p.netPnL).toFixed(2)}`
  const winRate = p.totalTrades > 0 ? Math.round((p.wins / p.totalTrades) * 100) : 0

  const html = emailWrapper(`
    ${heroSection('📈', 'Weekly Report', `Weekly Performance — ${p.weekLabel}`, `Your trading week wrapped up. Here's a full breakdown, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: 'Net P&L', value: pnlStr, color: pnlColor },
      { label: 'Win Rate', value: `${winRate}%`, color: '#9b8aff' },
      { label: 'Total Trades', value: String(p.totalTrades) },
    ])}
    ${separator()}
    ${infoBox(`
      <p style="margin:0 0 10px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Week Highlights</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Best day</td>
          <td style="padding:6px 0;color:#22c55e;font-size:13px;font-weight:600;text-align:right;">${p.bestDay}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Top setup</td>
          <td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">${p.topSetup}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b6980;font-size:13px;">Wins / Losses</td>
          <td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">${p.wins}W / ${p.losses}L</td>
        </tr>
      </table>
    `)}
    ${ctaButton('View Weekly Analytics', `${SITE_URL}/analytics`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `Weekly Trading Report — ${p.weekLabel}`, html })
}

// ─── 3. Profit Target Reached ─────────────────────────────────────────────────

export interface ProfitTargetParams {
  email: string
  name: string
  prefs: NotificationPrefs
  accountName: string
  targetAmount: number
  currentPnL: number
  currency: string
}

export async function sendProfitTargetEmail(p: ProfitTargetParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.profit_target_alerts) return

  const pnlStr = `${p.currency}${p.currentPnL.toFixed(2)}`
  const targetStr = `${p.currency}${p.targetAmount.toFixed(2)}`

  const html = emailWrapper(`
    ${heroSection('🎯', 'Profit Target', 'Profit Target Reached!', `You've hit your profit target on ${p.accountName}. Consider locking in your gains, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: 'Your P&L', value: `+${pnlStr}`, color: '#22c55e' },
      { label: 'Target', value: targetStr, color: '#9b8aff' },
    ])}
    ${infoBox(`
      <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">
        Outstanding discipline! You've reached your profit target for this period.
        Consider whether you want to continue trading or protect your gains for the day.
      </p>
    `, '#22c55e')}
    ${ctaButton('Review Account', `${SITE_URL}/accounts`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `🎯 Profit Target Reached — ${p.accountName}`, html })
}

// ─── 4. Drawdown Warning ──────────────────────────────────────────────────────

export interface DrawdownWarningParams {
  email: string
  name: string
  prefs: NotificationPrefs
  accountName: string
  currentDrawdown: number   // percentage, e.g. 7.5
  maxDrawdown: number       // percentage, e.g. 10
  currency: string
  drawdownAmount: number
}

export async function sendDrawdownWarningEmail(p: DrawdownWarningParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.drawdown_warnings) return

  const pctUsed = Math.round((p.currentDrawdown / p.maxDrawdown) * 100)

  const html = emailWrapper(`
    ${heroSection('⚠️', 'Drawdown Warning', 'Approaching Drawdown Limit', `Your account is at ${p.currentDrawdown.toFixed(1)}% drawdown — ${pctUsed}% of your max. Stay disciplined, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: 'Current Drawdown', value: `${p.currentDrawdown.toFixed(1)}%`, color: '#f97316' },
      { label: 'Max Drawdown', value: `${p.maxDrawdown.toFixed(1)}%`, color: '#9b8aff' },
      { label: 'Amount', value: `-${p.currency}${Math.abs(p.drawdownAmount).toFixed(2)}`, color: '#ef4444' },
    ])}
    ${infoBox(`
      <p style="margin:0 0 6px 0;color:#f97316;font-size:13px;font-weight:600;">Recommendations</p>
      <ul style="margin:0;padding-left:18px;color:#8b8a9e;font-size:13px;line-height:1.8;">
        <li>Reduce your position sizes</li>
        <li>Only take A+ setups</li>
        <li>Consider pausing trading for the rest of the day</li>
      </ul>
    `, '#f97316')}
    ${ctaButton('Review Risk Settings', `${SITE_URL}/settings`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `⚠️ Drawdown Warning — ${p.accountName} at ${p.currentDrawdown.toFixed(1)}%`, html })
}

// ─── 5. Daily Loss Limit ──────────────────────────────────────────────────────

export interface DailyLossLimitParams {
  email: string
  name: string
  prefs: NotificationPrefs
  accountName: string
  dailyLoss: number
  dailyLimit: number
  currency: string
}

export async function sendDailyLossLimitEmail(p: DailyLossLimitParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.daily_loss_alerts) return

  const html = emailWrapper(`
    ${heroSection('🛑', 'Daily Loss Limit', 'Daily Loss Limit Reached', `You've hit your daily loss limit on ${p.accountName}. Stop trading and protect your capital, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: "Today's Loss", value: `-${p.currency}${Math.abs(p.dailyLoss).toFixed(2)}`, color: '#ef4444' },
      { label: 'Daily Limit', value: `${p.currency}${p.dailyLimit.toFixed(2)}`, color: '#9b8aff' },
    ])}
    ${infoBox(`
      <p style="margin:0 0 6px 0;color:#ef4444;font-size:13px;font-weight:600;">Stop Trading for Today</p>
      <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">
        You've reached your maximum daily loss threshold. The best traders know when to walk away.
        Close your platform, review your trades, and come back fresh tomorrow.
      </p>
    `, '#ef4444')}
    ${ctaButton('Review Today\'s Trades', `${SITE_URL}/trades`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `🛑 Daily Loss Limit Reached — ${p.accountName}`, html })
}

// ─── 6. Trade Reminders ───────────────────────────────────────────────────────

export interface TradeReminderParams {
  email: string
  name: string
  prefs: NotificationPrefs
  openTrades: { symbol: string; daysOpen: number; direction: string }[]
}

export async function sendTradeReminderEmail(p: TradeReminderParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.trade_reminders) return
  if (p.openTrades.length === 0) return

  const rows = p.openTrades.map(t => `
    <tr>
      <td style="padding:10px 0;color:#e4e2f0;font-size:13px;border-bottom:1px solid #1e1b36;">${t.symbol}</td>
      <td style="padding:10px 0;color:${t.direction === 'long' ? '#22c55e' : '#ef4444'};font-size:13px;text-align:center;border-bottom:1px solid #1e1b36;text-transform:capitalize;">${t.direction}</td>
      <td style="padding:10px 0;color:#6b6980;font-size:13px;text-align:right;border-bottom:1px solid #1e1b36;">${t.daysOpen}d open</td>
    </tr>`).join('')

  const html = emailWrapper(`
    ${heroSection('📋', 'Trade Reminder', `You Have ${p.openTrades.length} Open Trade${p.openTrades.length > 1 ? 's' : ''}`, `Don't forget to journal and close your open positions, ${p.name}.`)}
    ${separator()}
    ${infoBox(`
      <p style="margin:0 0 12px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Open Trades</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Symbol</td>
          <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;">Direction</td>
          <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;">Duration</td>
        </tr>
        ${rows}
      </table>
    `)}
    ${ctaButton('Journal Your Trades', `${SITE_URL}/trades`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `📋 Reminder: ${p.openTrades.length} Open Trade${p.openTrades.length > 1 ? 's' : ''} to Journal`, html })
}

// ─── 7. Winning Streak ────────────────────────────────────────────────────────

export interface WinningStreakParams {
  email: string
  name: string
  prefs: NotificationPrefs
  streakDays: number
  totalPnL: number
  currency: string
}

export async function sendWinningStreakEmail(p: WinningStreakParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.winning_streak_notifications) return

  const html = emailWrapper(`
    ${heroSection('🔥', 'Winning Streak', `${p.streakDays}-Day Winning Streak!`, `You're on fire, ${p.name}! ${p.streakDays} consecutive profitable days and counting.`)}
    ${separator()}
    ${statRow([
      { label: 'Streak', value: `${p.streakDays} days`, color: '#f97316' },
      { label: 'Total P&L', value: `+${p.currency}${p.totalPnL.toFixed(2)}`, color: '#22c55e' },
    ])}
    ${infoBox(`
      <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">
        Keep following your process — not just your streak. Stay disciplined, keep taking A+ setups only,
        and let the results take care of themselves.
      </p>
    `, '#f97316')}
    ${ctaButton('Keep Going', `${SITE_URL}/dashboard`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `🔥 ${p.streakDays}-Day Winning Streak — Keep it up!`, html })
}

// ─── 8. New Personal Best ─────────────────────────────────────────────────────

export interface PersonalBestParams {
  email: string
  name: string
  prefs: NotificationPrefs
  date: string          // e.g. "21 Feb 2026"
  newBest: number
  previousBest: number
  currency: string
  totalTrades: number
}

export async function sendPersonalBestEmail(p: PersonalBestParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.personal_best_notifications) return

  const improvement = p.newBest - p.previousBest

  const html = emailWrapper(`
    ${heroSection('🏆', 'Personal Best', 'New Personal Best Day!', `You just set a new best trading day, ${p.name}! This is what consistency looks like.`)}
    ${separator()}
    ${statRow([
      { label: 'New Best', value: `+${p.currency}${p.newBest.toFixed(2)}`, color: '#22c55e' },
      { label: 'Previous Best', value: `+${p.currency}${p.previousBest.toFixed(2)}`, color: '#9b8aff' },
      { label: 'Improvement', value: `+${p.currency}${improvement.toFixed(2)}`, color: '#f97316' },
    ])}
    ${infoBox(`
      <p style="margin:0 0 4px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">What made today great</p>
      <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">
        Take a moment to journal why today worked. Record your setups, your mindset, and your execution —
        so you can repeat this performance consistently.
      </p>
    `)}
    ${ctaButton('Journal Today', `${SITE_URL}/trades`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `🏆 New Personal Best — ${p.currency}${p.newBest.toFixed(2)} on ${p.date}`, html })
}

// ─── 9. Milestone Achievement ─────────────────────────────────────────────────

export interface MilestoneParams {
  email: string
  name: string
  prefs: NotificationPrefs
  milestone: number         // e.g. 100, 250, 500
  totalTrades: number
  winRate: number           // e.g. 63.5
  netPnL: number
  currency: string
}

export async function sendMilestoneEmail(p: MilestoneParams): Promise<void> {
  if (!p.prefs.email_notifications || !p.prefs.milestone_notifications) return

  const pnlColor = p.netPnL >= 0 ? '#22c55e' : '#ef4444'
  const pnlStr = `${p.netPnL >= 0 ? '+' : ''}${p.currency}${Math.abs(p.netPnL).toFixed(2)}`

  const html = emailWrapper(`
    ${heroSection('🎖️', 'Milestone', `${p.milestone} Trades Milestone!`, `You've logged ${p.milestone} trades in your journal. That's the kind of consistency that builds elite traders, ${p.name}.`)}
    ${separator()}
    ${statRow([
      { label: 'Total Trades', value: String(p.totalTrades) },
      { label: 'Win Rate', value: `${p.winRate.toFixed(1)}%`, color: '#9b8aff' },
      { label: 'All-Time P&L', value: pnlStr, color: pnlColor },
    ])}
    ${infoBox(`
      <p style="margin:0 0 4px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Keep the data flowing</p>
      <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">
        Every trade you log adds to your edge. Review your analytics to find patterns in your best and
        worst setups — your data holds the answers.
      </p>
    `)}
    ${ctaButton('View Your Analytics', `${SITE_URL}/analytics`)}
  `)

  const t = createTransporter()
  await t.sendMail({ from: FROM, to: p.email, subject: `🎖️ ${p.milestone} Trades Milestone Unlocked!`, html })
}
