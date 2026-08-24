const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null; // email not configured — skip silently
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Sends a status-change email to the customer. Never throws — a failed email
 * should never break the order/status-update flow, so errors are just logged.
 */
async function sendStatusEmail(customerEmail, orderId, status) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email skipped — SMTP not configured] Order #${orderId} -> ${status} for ${customerEmail}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to: customerEmail,
      subject: `Order #${orderId} update: ${status}`,
      text: `Your order #${orderId} status has changed to: ${status}.`,
    });
  } catch (err) {
    console.error('Failed to send status email:', err.message);
  }
}

module.exports = { sendStatusEmail };
