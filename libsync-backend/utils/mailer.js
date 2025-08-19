const nodemailer = require('nodemailer');

// Build transport: use SMTP if configured, otherwise fall back to JSON transport (logs only)
let transporter;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
} else if (true) {
  // Default to Mailtrap sandbox for testing if no SMTP env configured
  transporter = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: 'c23862bf1bf37a',
      pass: 'a5cc140cfe7c97',
    },
  });
  console.warn('[mailer] Using Mailtrap sandbox transport for testing.');
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
  console.warn('[mailer] No SMTP configured. Using JSON transport (emails are logged, not sent).');
}

exports.sendMail = async ({ to, subject, text, html }) => {
  if (!to) throw new Error('Missing recipient');
  const from = process.env.MAIL_FROM || 'no-reply@libsync.local';
  return transporter.sendMail({ from, to, subject, text, html });
};


