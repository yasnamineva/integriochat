/**
 * Email sending via SMTP (Namecheap Private Email).
 *
 * Required env vars (set in Vercel project settings for production):
 *   SMTP_HOST     = mail.privateemail.com
 *   SMTP_PORT     = 587
 *   SMTP_USER     = noreply@integriochat.com   (your Namecheap email address)
 *   SMTP_PASS     = <your email password>
 *   EMAIL_FROM    = IntegrioChat <noreply@integriochat.com>
 *
 * Falls back to console.log in dev if SMTP_HOST is not set.
 */
import nodemailer from "nodemailer";

const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "https://integriochat.com";
const appName = "IntegrioChat";
const from = process.env["EMAIL_FROM"] ?? `${appName} <noreply@integriochat.com>`;

function createTransport() {
  const host = process.env["SMTP_HOST"];
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env["SMTP_PORT"] ?? "587"),
    secure: process.env["SMTP_PORT"] === "465",
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const transport = createTransport();

  if (!transport) {
    // Dev fallback — no SMTP config needed locally
    console.log(
      `\n[EMAIL DEV] Password reset for ${email}\nReset link: ${resetUrl}\n`
    );
    return;
  }

  await transport.sendMail({
    from,
    to: email,
    subject: `Reset your ${appName} password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="font-size:20px;margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px">
          Someone requested a password reset for your ${appName} account.
          If this wasn&rsquo;t you, you can safely ignore this email.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          This link expires in 1 hour.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:11px">
          ${appName} · <a href="${baseUrl}" style="color:#bbb">${baseUrl.replace("https://", "")}</a>
        </p>
      </div>
    `,
    text: `Reset your ${appName} password\n\nVisit this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}
