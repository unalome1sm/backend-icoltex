import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@icoltex.com';

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendVerificationCode(to: string, code: string, purpose: 'register' | 'login'): Promise<void> {
  const subject = purpose === 'register'
    ? 'Icoltex - Código de verificación para registro'
    : 'Icoltex - Código de verificación para inicio de sesión';

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Código de verificación</h2>
      <p>Tu código de verificación es:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${code}</p>
      <p style="color: #64748b; font-size: 14px;">Este código expira en ${process.env.AUTH_OTP_TTL_MINUTES || 10} minutos. No lo compartas con nadie.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
    text: `Tu código de verificación es: ${code}. Expira en ${process.env.AUTH_OTP_TTL_MINUTES || 10} minutos.`,
  });
}
