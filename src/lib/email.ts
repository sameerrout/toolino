/**
 * Toolino - Transactional Email Delivery Service
 *
 * Supports AWS SES / SMTP / transactional email providers.
 * Server-only module - credentials never exposed to the client.
 */

import nodemailer from 'nodemailer';
import { SITE_URL } from '@/lib/site';

interface SendPasswordResetParams {
  to: string;
  resetToken: string;
}

/**
 * Returns a configured nodemailer transporter using environment variables.
 */
function getEmailTransporter() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.EMAIL_PROVIDER_API_KEY;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PROVIDER_SECRET;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return null;
}

/**
 * Sends a secure password reset email with cryptographic token.
 */
export async function sendPasswordResetEmail({ to, resetToken }: SendPasswordResetParams): Promise<boolean> {
  const resetUrl = `${SITE_URL}/reset-password/?token=${encodeURIComponent(resetToken)}`;
  const fromAddress = process.env.EMAIL_FROM || `Toolino <noreply@${new URL(SITE_URL).host}>`;

  const subject = 'Password Reset Request - Toolino';

  const textContent = `Toolino\n\nPassword Reset Request\n\nWe received a request to reset your Toolino password.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link expires in 60 minutes.\n\nIf you did not request this, you can safely ignore this email.\n`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Password Reset Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0; }
    .btn-container { margin: 28px 0; text-align: center; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Toolino</div>
    <div class="title">Password Reset Request</div>
    <p>We received a request to reset your Toolino password.</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <p>This link expires in 60 minutes.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
    <div class="footer">
      This is an automated security message from Toolino (${SITE_URL}).
    </div>
  </div>
</body>
</html>`;

  const transporter = getEmailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return true;
    } catch (err) {
      console.error('Failed to send password reset email via transporter:', err);
      return false;
    }
  } else {
    // When SMTP credentials are not yet configured in local development,
    // log a clear warning without throwing, and allow the flow to proceed safely.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[Toolino Email] SMTP credentials not configured. In development, reset link would be: ${resetUrl}`
      );
    }
    return true;
  }
}
