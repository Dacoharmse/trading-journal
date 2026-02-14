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
</head>
<body style="margin: 0; padding: 0; background-color: #1a1d23; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1d23;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 0 30px 0;">
              <img src="${logoUrl}" alt="2GS Trading" width="200" style="display: block; max-width: 200px; height: auto;" />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #2a2e35; border-radius: 16px; overflow: hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Gold Accent Bar -->
                <tr>
                  <td style="background: linear-gradient(90deg, #f59e0b, #d97706); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- Welcome Section -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      Welcome, ${name}!
                    </h1>
                    <p style="margin: 0; color: #9ca3af; font-size: 16px; line-height: 1.6;">
                      Your 2GS Trading Journal account is ready. You're all set to start tracking, analyzing, and improving your trading performance.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <div style="border-top: 1px solid #374151; margin: 10px 0;"></div>
                  </td>
                </tr>

                <!-- Getting Started -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #f59e0b; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Getting Started
                    </h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 36px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background-color: #f59e0b; border-radius: 50%; text-align: center; line-height: 28px; color: #1a1d23; font-weight: 700; font-size: 14px;">1</div>
                              </td>
                              <td style="padding-left: 12px; vertical-align: top;">
                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Log Your First Trade</p>
                                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">Click "+ New Trade" to record your entry, exit, and notes.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 36px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background-color: #f59e0b; border-radius: 50%; text-align: center; line-height: 28px; color: #1a1d23; font-weight: 700; font-size: 14px;">2</div>
                              </td>
                              <td style="padding-left: 12px; vertical-align: top;">
                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Build Your Playbook</p>
                                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">Create trading setups and strategies to stay consistent.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 36px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background-color: #f59e0b; border-radius: 50%; text-align: center; line-height: 28px; color: #1a1d23; font-weight: 700; font-size: 14px;">3</div>
                              </td>
                              <td style="padding-left: 12px; vertical-align: top;">
                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Review Your Analytics</p>
                                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">Track your win rate, P&L, and performance trends over time.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Features Grid -->
                <tr>
                  <td style="padding: 10px 40px 20px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #f59e0b; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      What You Get
                    </h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Trade Journal</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Log and review every trade with detailed notes</p>
                          </div>
                        </td>
                        <td width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Analytics</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Detailed performance metrics and charts</p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Playbooks</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Save and refine your trading strategies</p>
                          </div>
                        </td>
                        <td width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Risk Management</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Monitor drawdowns and position sizing</p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Trade Calendar</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Visualize your daily trading activity</p>
                          </div>
                        </td>
                        <td width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
                          <div style="background-color: #1a1d23; border-radius: 10px; padding: 16px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Mentorship</p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.4;">Learn from experienced traders in the community</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 20px 40px 30px 40px;">
                    <a href="${siteUrl}/auth/login" style="display: inline-block; background-color: #f59e0b; color: #1a1d23; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                      Start Trading Journal
                    </a>
                  </td>
                </tr>

                <!-- Pro Tip -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #1a1d23; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                      <p style="margin: 0 0 4px 0; color: #f59e0b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pro Tip</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                        The most successful traders journal every trade &mdash; wins and losses. Consistency in journaling leads to consistency in profits.
                      </p>
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 0 0 0; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                You're receiving this because you registered for a 2GS Trading Journal account.
              </p>
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                &copy; ${new Date().getFullYear()} 2GS Trading. All rights reserved.
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
