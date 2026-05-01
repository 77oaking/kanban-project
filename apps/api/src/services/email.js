/**
 * Email service — wraps Nodemailer with a single `sendMail()` entry point.
 *
 * The whole module is lazy and side-effect-free:
 *   - If no SMTP_HOST is configured, every call resolves with `{ skipped: true }`
 *     and the would-be email is logged to the console. This keeps local dev
 *     and the CI build green without a working mail relay.
 *   - The transport is constructed on first use, then cached.
 *
 * Templates live in `./templates.js` and return `{ subject, html, text }`.
 */
import nodemailer from 'nodemailer';
import { logger } from '../lib/logger.js';
import { renderInvitationEmail, renderMentionEmail } from './email-templates.js';

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  if (!isConfigured()) return null;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    // STARTTLS on 587 → secure: false; TLS on 465 → secure: true
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return cachedTransport;
}

export function isConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

async function sendMail({ to, subject, html, text }) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || 'FredoCloud Team Hub <noreply@fredocloud.test>';

  if (!transport) {
    logger.info('[email] SMTP not configured — would have sent', { to, subject });
    return { skipped: true };
  }

  try {
    const info = await transport.sendMail({ from, to, subject, html, text });
    logger.info('[email] sent', { to, subject, messageId: info.messageId });
    return { messageId: info.messageId };
  } catch (err) {
    // Email failures should never break the API request that triggered them.
    logger.warn('[email] failed', { to, subject, error: err.message });
    return { error: err.message };
  }
}

export async function sendInvitationEmail({ to, inviterName, workspaceName, acceptUrl }) {
  return sendMail({ to, ...renderInvitationEmail({ inviterName, workspaceName, acceptUrl }) });
}

export async function sendMentionEmail({ to, mentionerName, workspaceName, snippet, link }) {
  return sendMail({ to, ...renderMentionEmail({ mentionerName, workspaceName, snippet, link }) });
}
