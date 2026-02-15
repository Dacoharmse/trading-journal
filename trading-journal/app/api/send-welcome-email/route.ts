import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const name = fullName || 'Trader'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://journal.2gs-trading.com'
    const logoUrl = `${siteUrl}/2gs-dark-logo.png`
    const year = new Date().getFullYear()

    await transporter.sendMail({
      from: `"2GS Trading" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Welcome to 2GS Trading Journal, ${name}!`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to 2GS Trading</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0a1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0c0a1a;">
    <tr>
      <td align="center" style="padding: 40px 16px 20px 16px;">

        <!-- Logo -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <img src="${logoUrl}" alt="2GS Trading" width="260" style="display: block; max-width: 260px; height: auto;" />
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #13111f; border-radius: 12px; border: 1px solid #1e1b36;">

          <!-- Purple Top Bar -->
          <tr>
            <td style="background-color: #7c3aed; height: 4px; font-size: 0; line-height: 0; border-radius: 12px 12px 0 0;">&nbsp;</td>
          </tr>

          <!-- Welcome Hero -->
          <tr>
            <td style="padding: 48px 48px 32px 48px; text-align: center;">
              <h1 style="margin: 0 0 14px 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3; letter-spacing: -0.3px;">
                Welcome aboard, ${name}
              </h1>
              <p style="margin: 0 auto; color: #8b8a9e; font-size: 15px; line-height: 1.7; max-width: 420px;">
                Your trading journal is ready. Track every trade, analyse your performance, and build the discipline that separates consistent traders from the rest.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 48px 40px 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" style="background-color: #7c3aed; border-radius: 8px;">
                    <a href="${siteUrl}/auth/login" target="_blank" style="display: inline-block; padding: 14px 44px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                      Open Your Journal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Separator -->
          <tr>
            <td style="padding: 0 48px;">
              <div style="height: 1px; background-color: #1e1b36;"></div>
            </td>
          </tr>

          <!-- Quick Start -->
          <tr>
            <td style="padding: 36px 48px 8px 48px;">
              <h2 style="margin: 0 0 24px 0; color: #9b8aff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px;">
                Quick Start Guide
              </h2>

              <!-- Step 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                <tr>
                  <td style="background-color: #19162b; border-radius: 8px; padding: 18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 40px; vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background-color: #7c3aed; border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 700; font-size: 14px;">01</div>
                        </td>
                        <td style="padding-left: 16px; vertical-align: middle;">
                          <p style="margin: 0; color: #e4e2f0; font-size: 14px; font-weight: 600;">Log your first trade</p>
                          <p style="margin: 4px 0 0 0; color: #6b6980; font-size: 13px; line-height: 1.5;">Record your entry, exit, setup type, and notes for every position.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                <tr>
                  <td style="background-color: #19162b; border-radius: 8px; padding: 18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 40px; vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background-color: #6d28d9; border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 700; font-size: 14px;">02</div>
                        </td>
                        <td style="padding-left: 16px; vertical-align: middle;">
                          <p style="margin: 0; color: #e4e2f0; font-size: 14px; font-weight: 600;">Build your playbook</p>
                          <p style="margin: 4px 0 0 0; color: #6b6980; font-size: 13px; line-height: 1.5;">Define your A+ setups and rules so you only take high-conviction trades.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="background-color: #19162b; border-radius: 8px; padding: 18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 40px; vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background-color: #5b21b6; border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 700; font-size: 14px;">03</div>
                        </td>
                        <td style="padding-left: 16px; vertical-align: middle;">
                          <p style="margin: 0; color: #e4e2f0; font-size: 14px; font-weight: 600;">Review your analytics</p>
                          <p style="margin: 4px 0 0 0; color: #6b6980; font-size: 13px; line-height: 1.5;">Track win rate, P&amp;L curves, and find patterns in your performance.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Separator -->
          <tr>
            <td style="padding: 28px 48px;">
              <div style="height: 1px; background-color: #1e1b36;"></div>
            </td>
          </tr>

          <!-- Platform Features -->
          <tr>
            <td style="padding: 0 48px 12px 48px;">
              <h2 style="margin: 0 0 20px 0; color: #9b8aff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px;">
                Platform Features
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" style="padding: 0 6px 12px 0; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #7c3aed;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Trade Journal</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Log trades with screenshots, notes &amp; tags</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding: 0 0 12px 6px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #6d28d9;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Analytics</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Performance metrics, charts &amp; insights</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 0 6px 12px 0; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #5b21b6;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Playbooks</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Save &amp; refine your trading strategies</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding: 0 0 12px 6px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #4c1d95;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Risk Manager</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Drawdown tracking &amp; position sizing</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 0 6px 0 0; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #7c3aed;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Trade Calendar</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Visualise daily P&amp;L at a glance</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding: 0 0 0 6px; vertical-align: top;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #19162b; border-radius: 8px; padding: 20px; border-left: 3px solid #6d28d9;">
                          <p style="margin: 0 0 4px 0; color: #e4e2f0; font-size: 13px; font-weight: 700;">Mentorship</p>
                          <p style="margin: 0; color: #6b6980; font-size: 11px; line-height: 1.5;">Learn from top community traders</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Separator -->
          <tr>
            <td style="padding: 24px 48px;">
              <div style="height: 1px; background-color: #1e1b36;"></div>
            </td>
          </tr>

          <!-- Pro Tip -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #19162b; border: 1px solid #2d2654; border-radius: 8px; padding: 24px;">
                    <p style="margin: 0 0 8px 0; color: #9b8aff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">From the Trading Desk</p>
                    <p style="margin: 0; color: #8b8a9e; font-size: 13px; line-height: 1.7; font-style: italic;">
                      &ldquo;The best traders journal every single trade &mdash; wins and losses. Consistency in reviewing your trades is what separates profitable traders from the rest.&rdquo;
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 28px 48px 10px 48px; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #3d3a52; font-size: 12px;">
                You received this because you created a 2GS Trading Journal account.
              </p>
              <p style="margin: 0; color: #2a2841; font-size: 11px;">
                &copy; ${year} 2GS Trading &bull; All rights reserved
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to send welcome email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
