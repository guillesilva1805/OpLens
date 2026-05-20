import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const FROM_EMAIL = 'OpsLens <onboarding@resend.dev>';

export async function sendVerificationEmail(to: string, token: string) {
  if (!resend) {
    console.warn('[Mock Email] Would have sent verification email to:', to, 'with token:', token);
    return;
  }
  
  // In a real app, this would be your production URL
  const verificationLink = `http://localhost:5173/?verify_token=${token}&email=${encodeURIComponent(to)}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'OpsLens - Verify your email address',
    html: `
      <h2>Verify your email address for OpsLens</h2>
      <p>Please click the link below to verify your email address to start receiving inventory exception alerts.</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `
  });
}

export async function sendTestEmail(to: string) {
  if (!resend) {
    console.warn('[Mock Email] Would have sent test email to:', to);
    return;
  }
  
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'OpsLens - Test Email',
    html: `
      <h2>OpsLens Integration Successful</h2>
      <p>This is a test email to confirm that your email preferences are configured correctly.</p>
      <p>You will now receive email notifications for your configured exception types.</p>
    `
  });
}

export async function sendCriticalExceptionEmail(to: string, sku: string, location: string, exceptionType: string, reason: string) {
  if (!resend) {
    console.warn('[Mock Email] Would have sent critical exception email for:', sku, 'to:', to);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `🚨 CRITICAL Exception: ${sku} at ${location}`,
    html: `
      <h2>Critical Exception Detected</h2>
      <p><strong>SKU:</strong> ${sku}</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Type:</strong> ${exceptionType}</p>
      <br/>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Log in to OpsLens to review and resolve this exception.</p>
    `
  });
}

export async function sendDailySummaryEmail(to: string, exceptionCount: number, listSnippetHtml: string) {
  if (!resend) {
    console.warn('[Mock Email] Would have sent daily summary to:', to, 'Count:', exceptionCount);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `OpsLens Daily Summary - ${exceptionCount} active exceptions`,
    html: `
      <h2>OpsLens Daily Summary</h2>
      <p>You have <strong>${exceptionCount}</strong> active exceptions matching your filters.</p>
      <br/>
      <h3>Top Pending Items:</h3>
      <div>${listSnippetHtml}</div>
      <br/>
      <p>Log in to OpsLens for the complete queue.</p>
    `
  });
}
