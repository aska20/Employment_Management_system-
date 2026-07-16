import nodemailer from 'nodemailer'

const createTransporter = () => {
    const email    = process.env.SMTP_EMAIL
    const password = process.env.SMTP_PASSWORD
    if (!email || !password) throw new Error('Email not configured. Please set up sender email in Admin Settings first.')
    return nodemailer.createTransport({ service: 'gmail', auth: { user: email, pass: password } })
}

export const sendWelcomeEmail = async ({ toEmail, toName, tempPassword }) => {
    const transporter = createTransporter()
    const fromEmail   = process.env.SMTP_EMAIL
    const appName     = process.env.APP_NAME || 'EMS Portal'
    const appUrl      = process.env.FRONTEND_URL || 'http://localhost:5173'

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f4;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:36px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">${appName}</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Employee Management System</p>
        </div>
        <div style="padding:36px 40px;">
          <p style="color:#44403c;font-size:16px;margin:0 0 8px;">Hello <strong>${toName}</strong>,</p>
          <p style="color:#78716c;font-size:15px;line-height:1.6;margin:0 0 28px;">Welcome to the team! Your employee account has been created. Use the credentials below to log in for the first time.</p>
          <div style="background:#f0fdf9;border:1.5px solid #99f6e4;border-radius:12px;padding:24px;margin-bottom:28px;">
            <p style="margin:0 0 14px;color:#134e4a;font-size:13px;font-weight:700;text-transform:uppercase;">Your Login Credentials</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#78716c;font-size:14px;padding:6px 0;width:120px;">Email</td><td style="color:#0f766e;font-weight:700;font-size:14px;font-family:monospace;">${toEmail}</td></tr>
              <tr><td style="color:#78716c;font-size:14px;padding:6px 0;">Temp Password</td><td style="color:#0f766e;font-weight:700;font-size:20px;font-family:monospace;letter-spacing:3px;">${tempPassword}</td></tr>
            </table>
          </div>
          <div style="background:#fefce8;border:1.5px solid #fde047;border-radius:12px;padding:16px;margin-bottom:28px;">
            <p style="margin:0 0 4px;color:#713f12;font-weight:700;font-size:14px;">⚠️ Password Change Required</p>
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">You must change your password immediately after your first login. Your temporary password will not work again after that.</p>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${appUrl}/login" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;">Login to EMS Portal →</a>
          </div>
          <p style="color:#a8a29e;font-size:13px;text-align:center;">If you did not expect this email, contact your admin immediately.</p>
        </div>
        <div style="background:#f5f5f4;padding:20px 40px;text-align:center;border-top:1px solid #e7e5e4;">
          <p style="color:#a8a29e;font-size:12px;margin:0;">${appName} · Automated message · Do not reply</p>
        </div>
      </div>
    </body></html>`

    await transporter.sendMail({
        from:    `"${appName}" <${fromEmail}>`,
        to:      toEmail,
        subject: `Welcome to ${appName} - Your Login Credentials`,
        html,
    })
}

export const sendTestEmail = async () => {
    const transporter = createTransporter()
    const fromEmail   = process.env.SMTP_EMAIL
    await transporter.sendMail({
        from:    `"EMS Portal" <${fromEmail}>`,
        to:      fromEmail,
        subject: 'EMS - Email Configuration Test ✅',
        html:    '<p style="font-family:Arial;padding:20px;">Your email configuration is working correctly! Employees will now receive welcome emails when you create their accounts.</p>',
    })
}
