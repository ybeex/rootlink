import { Worker } from 'bullmq';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getRedis } from '../lib/redis.js';
import { QUEUE_NAMES } from '@rootlink/shared';
import { env } from '../config/env.js';
import type { EmailNotificationJob } from './queues.js';
import pino from 'pino';

const logger = pino({ name: 'email-worker' });

// ── Template renderer ────────────────────────────────────────────────────────

type TemplateResult = { subject: string; html: string; text: string };
type TemplateData   = Record<string, unknown>;

// ── HTML escaping ────────────────────────────────────────────────────────────
//
// Several templates interpolate user-controlled strings (tree names, invite
// messages, inviter names, AI-generated hint titles/descriptions) directly
// into HTML email bodies. A user who sets their tree name to e.g.
// `<img src=x onerror=alert(1)>` would otherwise have that markup rendered
// by the recipient's email client. Plain-text bodies do NOT go through this
// — escaping plain text would incorrectly show "&amp;" instead of "&" to
// the recipient.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

/** Shorthand for escapeHtml — used pervasively in the HTML template strings below. */
const esc = escapeHtml;

const TEMPLATES: Record<string, (data: TemplateData) => TemplateResult> = {
  'verify-email': (data) => ({
    subject: 'Verify your RootLink email address',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:600;color:#131e3d;margin-bottom:8px">Verify your email</h1>
        <p style="color:#405582;line-height:1.6">Welcome to RootLink, ${esc(data['firstName'] ?? 'there')}. Click below to verify your email address and start building your family tree.</p>
        <a href="${esc(data['verifyUrl'])}" style="display:inline-block;margin-top:24px;background:#1e2e54;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">Verify Email Address</a>
        <p style="margin-top:24px;font-size:12px;color:#8c99b4">This link expires in 24 hours. If you did not create a RootLink account, you can ignore this email.</p>
      </div>`,
    text: `Welcome to RootLink, ${String(data['firstName'] ?? 'there')}.\n\nVerify your email: ${String(data['verifyUrl'])}\n\nThis link expires in 24 hours.`,
  }),

  'tree-invite': (data) => ({
    // Subject lines are also rendered as text in most mail clients, but some
    // webmail clients render HTML entities in subjects too — escape here as
    // well so a tree named "Smith & Jones" doesn't become "Smith &amp; Jones"
    // in the inbox list. We use the escaped form consistently for subject.
    subject: `${escapeHtml(data['inviterName'])} invited you to a family tree on RootLink`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:600;color:#131e3d">${esc(data['inviterName'])} shared a family tree with you</h1>
        <p style="color:#405582;line-height:1.6">You have been invited to collaborate on <strong>${esc(data['treeName'])}</strong> as a ${esc(data['role'])}.</p>
        ${data['message'] ? `<blockquote style="border-left:3px solid #e8d5b0;margin:16px 0;padding:12px 16px;color:#66779b;font-style:italic">${esc(data['message'])}</blockquote>` : ''}
        <a href="${esc(data['acceptUrl'])}" style="display:inline-block;margin-top:24px;background:#1e2e54;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">Accept Invitation</a>
        <p style="margin-top:24px;font-size:12px;color:#8c99b4">This invitation expires in 7 days.</p>
      </div>`,
    text: `${String(data['inviterName'])} invited you to the "${String(data['treeName'])}" family tree on RootLink.\n\nAccept: ${String(data['acceptUrl'])}`,
  }),

  'password-reset': (data) => ({
    subject: 'Reset your RootLink password',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:600;color:#131e3d">Reset your password</h1>
        <p style="color:#405582;line-height:1.6">We received a request to reset the password for your RootLink account.</p>
        <a href="${esc(data['resetUrl'])}" style="display:inline-block;margin-top:24px;background:#1e2e54;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">Reset Password</a>
        <p style="margin-top:24px;font-size:12px;color:#8c99b4">This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
      </div>`,
    text: `Reset your RootLink password: ${String(data['resetUrl'])}\n\nThis link expires in 1 hour.`,
  }),

  'hint-found': (data) => ({
    subject: `New record found for ${escapeHtml(data['personName'])} in your family tree`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:600;color:#131e3d">A new record was found</h1>
        <p style="color:#405582;line-height:1.6">We found a potential match for <strong>${esc(data['personName'])}</strong> in <strong>${esc(data['treeName'])}</strong>.</p>
        <p style="color:#405582"><strong>${esc(data['hintTitle'])}</strong><br/>${esc(data['hintDescription'])}</p>
        <a href="${esc(data['reviewUrl'])}" style="display:inline-block;margin-top:24px;background:#f24e0e;color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">Review Record</a>
      </div>`,
    text: `New record found for ${String(data['personName'])}: ${String(data['hintTitle'])}\n\nReview: ${String(data['reviewUrl'])}`,
  }),
};

// ── Transporter factory (named import — avoids ESM default-export issue) ───

function createEmailTransporter(): Transporter {
  if (!env.SMTP_HOST) {
    // Dev mode: log emails to console instead of sending
    return createTransport({ jsonTransport: true });
  }

  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  _transporter ??= createEmailTransporter();
  return _transporter;
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startEmailWorker() {
  return new Worker<EmailNotificationJob>(
    QUEUE_NAMES.emailNotifications,
    async (job) => {
      const { to, templateId, templateData } = job.data;

      const templateFn = TEMPLATES[templateId];
      if (!templateFn) {
        throw new Error(`Unknown email template: ${templateId}`);
      }

      const { subject, html, text } = templateFn(templateData);
      const transporter = getTransporter();

      const info = await transporter.sendMail({
        from: `RootLink <${env.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });

      if (!env.SMTP_HOST) {
        logger.info(
          { to, subject, preview: (info as { message?: string }).message?.slice(0, 120) },
          'Email (dev mode — not sent, logged only)',
        );
      } else {
        logger.info(
          { to, subject, messageId: (info as { messageId?: string }).messageId },
          'Email sent',
        );
      }
    },
    {
      connection: getRedis(),
      concurrency: 10,
    },
  );
}
