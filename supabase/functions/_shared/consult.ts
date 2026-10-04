// Shared helpers for the consultation booking edge functions.
import { escapeHtml } from "./security.ts";

export const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";
export const ADMIN_EMAIL = "voiceofpreemies@gmail.com";
export const SITE_URL = "https://voiceofpreemies.org";
const KIGALI = "Africa/Kigali";

export interface ProviderRow {
  title: string;
  full_name: string;
  notify_email: string | null;
}

export interface BookingRow {
  id: string;
  reference: string;
  provider_id: string;
  starts_at: string;
  ends_at: string;
  mode: "call" | "in_person";
  parent_name: string;
  phone: string;
  email: string;
  topic: string | null;
  baby_age: string | null;
  payer_name: string;
  booking_fee: number;
  full_fee: number;
  status: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}

export async function loadContactInfo(supabaseUrl: string, serviceKey: string): Promise<ContactInfo> {
  const fallback: ContactInfo = { phone: "+250799534957", email: ADMIN_EMAIL, address: "Kigali, Rwanda" };
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?select=org_phone,org_email,org_address&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return fallback;
    const rows = await res.json();
    const r = rows?.[0];
    if (!r) return fallback;
    return {
      phone: r.org_phone || fallback.phone,
      email: r.org_email || fallback.email,
      address: r.org_address || fallback.address,
    };
  } catch {
    return fallback;
  }
}

export const providerName = (p: ProviderRow) => `${p.title ? p.title + " " : ""}${p.full_name}`.trim();

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: KIGALI, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: KIGALI, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const formatFee = (n: number) => `${n.toLocaleString("en-US")} RWF`;

export const modeLabel = (m: string, c: ContactInfo) =>
  m === "in_person" ? `In person at the Voice of Preemies office (${c.address})` : "Phone / online call";

export function detailsTable(rows: [string, string][]): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:9px 12px;font-weight:600;color:#0A6070;border-bottom:1px solid #E2E8F0;white-space:nowrap;vertical-align:top;font-size:13px">${escapeHtml(label)}</td><td style="padding:9px 12px;color:#334155;border-bottom:1px solid #E2E8F0;word-break:break-word;font-size:14px">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 20px;border:1px solid #E2E8F0">${body}</table>`;
}

export function paragraph(text: string, muted = false): string {
  return `<p style="margin:0 0 16px;color:${muted ? "#64748B" : "#334155"};font-size:${muted ? "13" : "15"}px;line-height:1.6">${escapeHtml(text)}</p>`;
}

export function emailShell(opts: { eyebrow: string; heading: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:28px 32px;text-align:center">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">${escapeHtml(opts.eyebrow)}</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${escapeHtml(opts.heading)}</h1>
    </div>
    <div style="padding:28px 32px">${opts.bodyHtml}</div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

export function contactLine(c: ContactInfo): string {
  return paragraph(
    `To cancel, reschedule or request a refund, call ${c.phone} or email ${c.email}.`,
    true
  );
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Sends each message independently so one bad address never blocks the others. */
export async function sendEmails(apiKey: string, messages: OutgoingEmail[]): Promise<boolean[]> {
  const results = await Promise.allSettled(
    messages.map(async (m) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [m.to],
          subject: m.subject,
          html: m.html,
          ...(m.replyTo ? { reply_to: m.replyTo } : {}),
        }),
      });
      return res.ok;
    })
  );
  return results.map((r) => r.status === "fulfilled" && r.value === true);
}
