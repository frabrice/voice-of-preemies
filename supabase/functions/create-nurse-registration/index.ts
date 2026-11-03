import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ADMIN_EMAIL,
  SITE_URL,
  detailsTable,
  emailShell,
  loadContactInfo,
  paragraph,
  sendEmails,
  OutgoingEmail,
} from "../_shared/consult.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// The training being registered for. Change these for the next training.
const TRAINING_KEY = "newborn-care-2026-11-08";
const TRAINING_TITLE = "Home & Hospital Newborn Care Training";
const TRAINING_DATE = "Sunday, 8 November 2026";
const TRAINING_TIME = "3:30 PM – 6:00 PM";
const TRAINING_VENUE = "Solace Ministries Conference Centre, KG 563 St, Kigali";
const TRAINING_FACILITATOR = "VoP Team";
// Registration closes when the training ends: 6:00 PM Kigali (UTC+2) on the day.
const CLOSES_AT = Date.parse("2026-11-08T16:00:00Z");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "Server not fully configured" }, 500);

    const body = await req.json().catch(() => ({}));

    // Honeypot: real visitors never fill this hidden field.
    if (typeof body.website === "string" && body.website.trim() !== "") return json({ success: true });

    if (Date.now() > CLOSES_AT) return json({ error: "closed" }, 410);

    const fullName = clean(body.fullName, 100);
    const phone = clean(body.phone, 30).replace(/[\s-]/g, "");
    const email = clean(body.email, 150).toLowerCase();
    const workplace = clean(body.workplace, 150);
    const years = Number(body.yearsExperience);

    if (!fullName || !phone || !email || !workplace || body.yearsExperience === "" || body.yearsExperience === null || body.yearsExperience === undefined) {
      return json({ error: "missing_fields" }, 400);
    }
    if (!/^\+?\d{9,15}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);
    if (!Number.isInteger(years) || years < 0 || years > 60) return json({ error: "invalid_years" }, 400);

    const adminHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/nurse_training_registrations`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ training_key: TRAINING_KEY, full_name: fullName, phone, email, years_experience: years, workplace }),
    });
    if (!ins.ok) {
      const err = await ins.json().catch(() => ({}));
      if (err?.code === "23505") return json({ error: "already_registered" }, 409);
      return json({ error: "registration_failed" }, 500);
    }

    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/nurse_training_registrations?training_key=eq.${TRAINING_KEY}&deleted_at=is.null&select=id`,
      { headers: { ...adminHeaders, Prefer: "count=exact", Range: "0-0" } }
    );
    const total = Number((countRes.headers.get("content-range") ?? "").split("/")[1]) || 0;

    const contact = await loadContactInfo(SUPABASE_URL, SERVICE_ROLE_KEY);
    const eventRows: [string, string][] = [
      ["Training", TRAINING_TITLE],
      ["Date", TRAINING_DATE],
      ["Time", `${TRAINING_TIME} (Kigali time)`],
      ["Venue", TRAINING_VENUE],
      ["Facilitator", TRAINING_FACILITATOR],
    ];

    const emails: OutgoingEmail[] = [
      {
        to: email,
        subject: `You are registered: ${TRAINING_TITLE}`,
        replyTo: contact.email,
        html: emailShell({
          eyebrow: "Registration confirmed",
          heading: "See you at the training",
          bodyHtml:
            paragraph(`Dear ${fullName},`) +
            paragraph("Thank you for registering. Your place is reserved and the training is free to attend. Here are the details:") +
            detailsTable(eventRows) +
            paragraph(`Questions or can no longer come? Call ${contact.phone} or reply to this email.`, true),
        }),
      },
      {
        to: ADMIN_EMAIL,
        subject: `New nurse registration: ${fullName} (${total} so far)`,
        replyTo: email,
        html: emailShell({
          eyebrow: "New registration",
          heading: `${total} nurse${total === 1 ? "" : "s"} registered`,
          bodyHtml:
            detailsTable([
              ["Name", fullName],
              ["Phone", phone],
              ["Email", email],
              ["Years of experience", String(years)],
              ["Works at", workplace],
              ["Training", `${TRAINING_TITLE}, ${TRAINING_DATE}`],
            ]) +
            `<p style="margin:0;color:#64748B;font-size:13px">See everyone in the <a href="${SITE_URL}/dashboard/events" style="color:#0A6070;text-decoration:underline">dashboard</a> under Events, Nurse Training.</p>`,
        }),
      },
    ];

    const sent = await sendEmails(RESEND_API_KEY, emails);
    return json({ success: true, confirmationEmailSent: sent[0] === true });
  } catch (err) {
    return json({ error: "registration_failed", detail: String(err) }, 500);
  }
});
