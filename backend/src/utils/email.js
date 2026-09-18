import nodemailer from 'nodemailer';
import 'dotenv/config';

// Resend or SendGrid free-tier SMTP relay both work with this transport
// (Section 6 — Tech Stack). If SMTP env vars are absent (local dev),
// emails are logged to the console instead of sent.
const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendMail({ to, subject, text }) {
  if (!to) return;
  if (!transporter) {
    console.log(`[email:dev-mode] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}

/** Out-of-scope note (Section 7): this is the ONLY automated email in v1 —
 * a copy of the leave request to the employee-entered notify email. */
export async function sendLeaveRequestCopy(request, user, leaveTypeName) {
  if (!request.notify_email) return;
  await sendMail({
    to: request.notify_email,
    subject: `Leave request submitted — ${user.full_name}`,
    text: [
      `A leave request has been submitted and is now pending approval.`,
      ``,
      `Employee: ${user.full_name} (${user.employee_id})`,
      `Leave type: ${leaveTypeName}`,
      `Dates: ${new Date(request.start_date).toISOString().slice(0, 10)} to ${new Date(request.end_date).toISOString().slice(0, 10)}${request.is_half_day ? ' (half-day)' : ''}`,
      `Reason: ${request.reason}`,
      ``,
      `This is an automated copy for your records. Approval status is tracked in StashHQ.`,
    ].join('\n'),
  });
}
