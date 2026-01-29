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

    await transporter.sendMail({
      from: `"2GS Trading" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to 2GS Trading Journal!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1d23; color: #e5e7eb; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ffffff; margin: 0;">2GS Trading</h1>
          </div>

          <h2 style="color: #ffffff; margin-bottom: 10px;">Welcome, ${name}!</h2>

          <p style="color: #d1d5db; line-height: 1.6; font-size: 15px;">
            Thank you for registering with 2GS Trading Journal. We're excited to have you on board!
          </p>

          <div style="background-color: #2a2e35; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="color: #fbbf24; font-weight: bold; margin: 0 0 8px 0;">Account Pending Approval</p>
            <p style="color: #d1d5db; margin: 0; font-size: 14px; line-height: 1.5;">
              Your account is currently under review. An administrator will review and approve your account shortly.
              You will be able to log in once your account has been approved.
            </p>
          </div>

          <p style="color: #d1d5db; line-height: 1.6; font-size: 15px;">
            In the meantime, here's what you can look forward to:
          </p>

          <ul style="color: #d1d5db; line-height: 2; font-size: 14px;">
            <li>Track and journal all your trades</li>
            <li>Analyze your trading performance with detailed analytics</li>
            <li>Create and manage trading playbooks</li>
            <li>Set goals and monitor your progress</li>
            <li>Backtest your strategies</li>
          </ul>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; border-top: 1px solid #374151; padding-top: 20px;">
            If you have any questions, feel free to reach out to us.<br>
            &mdash; The 2GS Trading Team
          </p>
        </div>
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
