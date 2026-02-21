/**
 * Send one test email for every notification type.
 * Usage:  node scripts/send-test-notifications.mjs [email] [name]
 * Example: node scripts/send-test-notifications.mjs dacoharmse13.dh@gmail.com "Daco"
 */

import nodemailer from 'nodemailer'

const TO    = process.argv[2] || 'dacoharmse13.dh@gmail.com'
const NAME  = process.argv[3] || 'Daco'
const SITE  = 'https://journal.2gs-trading.com'
const FROM  = '"2GS Trading" <no-reply@2gs-trading.com>'
const YEAR  = new Date().getFullYear()
const LOGO  = `${SITE}/2gs-dark-logo.png`
const CURRENCY = '$'

const transporter = nodemailer.createTransport({
  host: 'mail.2gs-trading.com',
  port: 465,
  secure: true,
  auth: { user: 'no-reply@2gs-trading.com', pass: 'no-reply@2gs-trading2026' },
})

// ─── Shared HTML Helpers ──────────────────────────────────────────────────────

function wrap(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0c0a1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0c0a1a;">
    <tr><td align="center" style="padding:40px 16px 20px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:0 0 28px 0;">
          <img src="${LOGO}" alt="2GS Trading" width="200" style="display:block;max-width:200px;height:auto;" />
        </td></tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#13111f;border-radius:12px;border:1px solid #1e1b36;">
        <tr><td style="background-color:#7c3aed;height:4px;font-size:0;line-height:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
        ${body}
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:24px 48px 10px 48px;text-align:center;">
          <p style="margin:0 0 6px 0;color:#3d3a52;font-size:12px;">Manage your notification preferences in <a href="${SITE}/settings" style="color:#7c3aed;text-decoration:none;">Settings</a>.</p>
          <p style="margin:0;color:#2a2841;font-size:11px;">&copy; ${YEAR} 2GS Trading &bull; All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function hero(icon, label, title, subtitle) {
  return `<tr><td style="padding:40px 48px 28px 48px;text-align:center;">
    <p style="margin:0 0 12px 0;font-size:36px;line-height:1;">${icon}</p>
    <p style="margin:0 0 8px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;">${label}</p>
    <h1 style="margin:0 0 12px 0;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">${title}</h1>
    <p style="margin:0 auto;color:#8b8a9e;font-size:15px;line-height:1.7;max-width:420px;">${subtitle}</p>
  </td></tr>`
}

function sep() {
  return `<tr><td style="padding:0 48px;"><div style="height:1px;background-color:#1e1b36;"></div></td></tr>`
}

function stats(items) {
  const cols = items.map(i =>
    `<td style="width:${100/items.length}%;text-align:center;padding:20px 12px;background-color:#19162b;border-radius:8px;">
      <p style="margin:0 0 4px 0;color:${i.color||'#7c3aed'};font-size:22px;font-weight:700;">${i.value}</p>
      <p style="margin:0;color:#6b6980;font-size:12px;">${i.label}</p>
    </td>`
  ).join('<td style="width:8px;"></td>')
  return `<tr><td style="padding:0 48px 28px 48px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cols}</tr></table></td></tr>`
}

function infoBox(content, accent = '#7c3aed') {
  return `<tr><td style="padding:0 48px 32px 48px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#19162b;border-left:3px solid ${accent};border-radius:8px;padding:20px 24px;">${content}</td></tr>
    </table>
  </td></tr>`
}

function cta(text, href) {
  return `<tr><td align="center" style="padding:0 48px 36px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#7c3aed;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 40px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.4px;">${text}</a>
      </td></tr>
    </table>
  </td></tr>`
}

// ─── 9 Email Templates ────────────────────────────────────────────────────────

const emails = [
  {
    subject: `Your Trading Summary — 21 Feb 2026`,
    html: wrap(`
      ${hero('📊','Daily Summary',`Trading Summary — 21 Feb 2026`,`Here's how your trading day went, ${NAME}.`)}
      ${sep()}
      ${stats([{label:'Net P&L',value:'+$185.00',color:'#22c55e'},{label:'Trades',value:'4'},{label:'Win Rate',value:'75%',color:'#9b8aff'}])}
      ${sep()}
      ${infoBox(`
        <p style="margin:0 0 10px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Highlights</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Best trade</td><td style="padding:6px 0;color:#22c55e;font-size:13px;font-weight:600;text-align:right;">XAUUSD +$120</td></tr>
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Worst trade</td><td style="padding:6px 0;color:#ef4444;font-size:13px;font-weight:600;text-align:right;">EURUSD -$35</td></tr>
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Wins / Losses</td><td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">3W / 1L</td></tr>
        </table>
      `)}
      ${cta('View Full Journal',`${SITE}/trades`)}
    `),
  },
  {
    subject: `Weekly Trading Report — 17–21 Feb 2026`,
    html: wrap(`
      ${hero('📈','Weekly Report',`Weekly Performance — 17–21 Feb 2026`,`Your trading week wrapped up. Here's a full breakdown, ${NAME}.`)}
      ${sep()}
      ${stats([{label:'Net P&L',value:'+$620.00',color:'#22c55e'},{label:'Win Rate',value:'68%',color:'#9b8aff'},{label:'Total Trades',value:'22'}])}
      ${sep()}
      ${infoBox(`
        <p style="margin:0 0 10px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Week Highlights</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Best day</td><td style="padding:6px 0;color:#22c55e;font-size:13px;font-weight:600;text-align:right;">Thursday +$240</td></tr>
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Top setup</td><td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">Break &amp; Retest (9 trades)</td></tr>
          <tr><td style="padding:6px 0;color:#6b6980;font-size:13px;">Wins / Losses</td><td style="padding:6px 0;color:#e4e2f0;font-size:13px;font-weight:600;text-align:right;">15W / 7L</td></tr>
        </table>
      `)}
      ${cta('View Weekly Analytics',`${SITE}/analytics`)}
    `),
  },
  {
    subject: `🎯 Profit Target Reached — Account XM-Demo`,
    html: wrap(`
      ${hero('🎯','Profit Target','Profit Target Reached!',`You've hit your profit target on XM-Demo. Consider locking in your gains, ${NAME}.`)}
      ${sep()}
      ${stats([{label:'Your P&L',value:'+$500.00',color:'#22c55e'},{label:'Target',value:'$500.00',color:'#9b8aff'}])}
      ${infoBox(`<p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">Outstanding discipline! You've reached your profit target for this period. Consider whether you want to continue trading or protect your gains for the day.</p>`,'#22c55e')}
      ${cta('Review Account',`${SITE}/accounts`)}
    `),
  },
  {
    subject: `⚠️ Drawdown Warning — Account XM-Demo at 7.5%`,
    html: wrap(`
      ${hero('⚠️','Drawdown Warning','Approaching Drawdown Limit',`Your account is at 7.5% drawdown — 75% of your max. Stay disciplined, ${NAME}.`)}
      ${sep()}
      ${stats([{label:'Current Drawdown',value:'7.5%',color:'#f97316'},{label:'Max Drawdown',value:'10.0%',color:'#9b8aff'},{label:'Amount',value:'-$375.00',color:'#ef4444'}])}
      ${infoBox(`
        <p style="margin:0 0 6px 0;color:#f97316;font-size:13px;font-weight:600;">Recommendations</p>
        <ul style="margin:0;padding-left:18px;color:#8b8a9e;font-size:13px;line-height:1.8;">
          <li>Reduce your position sizes</li>
          <li>Only take A+ setups</li>
          <li>Consider pausing trading for the rest of the day</li>
        </ul>
      `,'#f97316')}
      ${cta('Review Risk Settings',`${SITE}/settings`)}
    `),
  },
  {
    subject: `🛑 Daily Loss Limit Reached — Account XM-Demo`,
    html: wrap(`
      ${hero('🛑','Daily Loss Limit','Daily Loss Limit Reached',`You've hit your daily loss limit on XM-Demo. Stop trading and protect your capital, ${NAME}.`)}
      ${sep()}
      ${stats([{label:"Today's Loss",value:'-$200.00',color:'#ef4444'},{label:'Daily Limit',value:'$200.00',color:'#9b8aff'}])}
      ${infoBox(`
        <p style="margin:0 0 6px 0;color:#ef4444;font-size:13px;font-weight:600;">Stop Trading for Today</p>
        <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">You've reached your maximum daily loss threshold. The best traders know when to walk away. Close your platform, review your trades, and come back fresh tomorrow.</p>
      `,'#ef4444')}
      ${cta("Review Today's Trades",`${SITE}/trades`)}
    `),
  },
  {
    subject: `📋 Reminder: 2 Open Trades to Journal`,
    html: wrap(`
      ${hero('📋','Trade Reminder','You Have 2 Open Trades',`Don't forget to journal and close your open positions, ${NAME}.`)}
      ${sep()}
      ${infoBox(`
        <p style="margin:0 0 12px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Open Trades</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Symbol</td>
            <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;">Direction</td>
            <td style="padding:0 0 8px 0;color:#3d3a52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;">Duration</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#e4e2f0;font-size:13px;border-bottom:1px solid #1e1b36;">XAUUSD</td>
            <td style="padding:10px 0;color:#22c55e;font-size:13px;text-align:center;border-bottom:1px solid #1e1b36;">Long</td>
            <td style="padding:10px 0;color:#6b6980;font-size:13px;text-align:right;border-bottom:1px solid #1e1b36;">1d open</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#e4e2f0;font-size:13px;">GBPUSD</td>
            <td style="padding:10px 0;color:#ef4444;font-size:13px;text-align:center;">Short</td>
            <td style="padding:10px 0;color:#6b6980;font-size:13px;text-align:right;">2d open</td>
          </tr>
        </table>
      `)}
      ${cta('Journal Your Trades',`${SITE}/trades`)}
    `),
  },
  {
    subject: `🔥 6-Day Winning Streak — Keep it up!`,
    html: wrap(`
      ${hero('🔥','Winning Streak','6-Day Winning Streak!',`You're on fire, ${NAME}! 6 consecutive profitable days and counting.`)}
      ${sep()}
      ${stats([{label:'Streak',value:'6 days',color:'#f97316'},{label:'Total P&L',value:'+$930.00',color:'#22c55e'}])}
      ${infoBox(`<p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">Keep following your process — not just your streak. Stay disciplined, keep taking A+ setups only, and let the results take care of themselves.</p>`,'#f97316')}
      ${cta('Keep Going',`${SITE}/dashboard`)}
    `),
  },
  {
    subject: `🏆 New Personal Best — $320.00 on 21 Feb 2026`,
    html: wrap(`
      ${hero('🏆','Personal Best','New Personal Best Day!',`You just set a new best trading day, ${NAME}! This is what consistency looks like.`)}
      ${sep()}
      ${stats([{label:'New Best',value:'+$320.00',color:'#22c55e'},{label:'Previous Best',value:'+$185.00',color:'#9b8aff'},{label:'Improvement',value:'+$135.00',color:'#f97316'}])}
      ${infoBox(`
        <p style="margin:0 0 4px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">What made today great</p>
        <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">Take a moment to journal why today worked. Record your setups, your mindset, and your execution — so you can repeat this performance consistently.</p>
      `)}
      ${cta('Journal Today',`${SITE}/trades`)}
    `),
  },
  {
    subject: `🎖️ 100 Trades Milestone Unlocked!`,
    html: wrap(`
      ${hero('🎖️','Milestone','100 Trades Milestone!',`You've logged 100 trades in your journal. That's the kind of consistency that builds elite traders, ${NAME}.`)}
      ${sep()}
      ${stats([{label:'Total Trades',value:'100'},{label:'Win Rate',value:'64.0%',color:'#9b8aff'},{label:'All-Time P&L',value:'+$2,840.00',color:'#22c55e'}])}
      ${infoBox(`
        <p style="margin:0 0 4px 0;color:#9b8aff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Keep the data flowing</p>
        <p style="margin:0;color:#8b8a9e;font-size:13px;line-height:1.7;">Every trade you log adds to your edge. Review your analytics to find patterns in your best and worst setups — your data holds the answers.</p>
      `)}
      ${cta('View Your Analytics',`${SITE}/analytics`)}
    `),
  },
]

// ─── Send All ─────────────────────────────────────────────────────────────────

console.log(`Sending ${emails.length} test notification emails to: ${TO}\n`)

for (const [i, mail] of emails.entries()) {
  try {
    await transporter.sendMail({ from: FROM, to: TO, subject: `[TEST] ${mail.subject}`, html: mail.html })
    console.log(`  ✓ [${i + 1}/${emails.length}] ${mail.subject}`)
  } catch (err) {
    console.error(`  ✗ [${i + 1}/${emails.length}] FAILED: ${mail.subject}\n    ${err.message}`)
  }
}

console.log('\nDone.')
