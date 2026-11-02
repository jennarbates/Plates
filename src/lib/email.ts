// A small outbox: emails are saved first, then sent, so a mail outage can't lose one.
// Import this from server code only.
import { getDb, type Queryable } from "@/lib/db";

const maxAttempts = 5;

export function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type EmailContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  rows?: [string, string][];
};

function renderHtml({ heading, paragraphs, rows }: EmailContent) {
  const table = rows?.length
    ? `<table style="width:100%;border-collapse:collapse;margin:18px 0">${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:7px 0;border-bottom:1px dotted #c9b8a8;color:#655e50">${escapeHtml(label)}</td>` +
            `<td style="padding:7px 0;border-bottom:1px dotted #c9b8a8;text-align:right">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const body = paragraphs.map((text) => `<p style="margin:0 0 14px">${escapeHtml(text)}</p>`).join("");
  return (
    `<div style="max-width:560px;margin:0 auto;padding:28px;background:#fffcf7;color:#3a3529;` +
    `font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5">` +
    `<h1 style="margin:0 0 16px;color:#8d3e47;font-weight:400;font-size:28px">${escapeHtml(heading)}</h1>` +
    `${body}${table}</div>`
  );
}

function renderText({ heading, paragraphs, rows }: EmailContent) {
  const lines = (rows ?? []).map(([label, value]) => `${label}: ${value}`);
  return [heading, ...paragraphs, ...(lines.length ? [lines.join("\n")] : [])].join("\n\n");
}

// A repeated key is ignored, so the same email can never be queued twice.
export async function queueEmail(
  db: Queryable,
  email: { dedupeKey: string; bookingId: string | null; recipient: string; content: EmailContent },
) {
  await db.query(
    `INSERT INTO emails (dedupe_key, booking_id, recipient, subject, html, body_text)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (dedupe_key) DO NOTHING`,
    [email.dedupeKey, email.bookingId, email.recipient, email.content.subject, renderHtml(email.content), renderText(email.content)],
  );
}

export async function deliverPendingEmails() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: 0, failed: 0, skipped: true };

  const db = await getDb();
  const { rows } = await db.query<{ id: string; dedupe_key: string; recipient: string; subject: string; html: string; body_text: string; attempts: number }>(
    `SELECT id, dedupe_key, recipient, subject, html, body_text, attempts FROM emails WHERE status = 'pending' ORDER BY created_at LIMIT 50`,
  );

  let sent = 0;
  let failed = 0;
  for (const email of rows) {
    try {
      const response = await fetch(`${process.env.EMAIL_API_BASE ?? "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": email.dedupe_key,
        },
        body: JSON.stringify({ from, to: [email.recipient], subject: email.subject, html: email.html, text: email.body_text }),
      });
      if (!response.ok) throw new Error(`Email service answered ${response.status}`);
      await db.query(`UPDATE emails SET status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = $1`, [email.id]);
      sent += 1;
    } catch (error) {
      const gaveUp = email.attempts + 1 >= maxAttempts;
      await db.query(`UPDATE emails SET status = $2, attempts = attempts + 1, last_error = $3 WHERE id = $1`, [
        email.id,
        gaveUp ? "failed" : "pending",
        error instanceof Error ? error.message : "Unknown error",
      ]);
      failed += 1;
    }
  }
  return { sent, failed, skipped: false };
}
