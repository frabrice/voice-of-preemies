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
// The Home Care line, as printed on the care contracts.
const CARE_PHONE = "+250 799 534 956";
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

const SERVICE_LABEL: Record<string, string> = { nurse: "Professional nurse", caregiver: "Trained baby caregiver", unsure: "Not sure yet" };
const SHIFT_LABEL: Record<string, string> = { day: "Day (8:00 AM – 8:00 PM)", night: "Night (8:00 PM – 8:00 AM)", both: "Day and night", unsure: "Not sure yet" };

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
    if (typeof body.website === "string" && body.website.trim() !== "") return json({ success: true, reference: "REQ-00000" });

    const parentName = clean(body.parentName, 100);
    const phone = clean(body.phone, 30).replace(/[\s-]/g, "");
    const email = clean(body.email, 150).toLowerCase();
    const service = pick(body.service, ["nurse", "caregiver", "unsure"] as const, "unsure");
    const shift = pick(body.shift, ["day", "night", "both", "unsure"] as const, "unsure");
    const locationType = pick(body.locationType, ["home", "hospital"] as const, "home");
    const locationDetail = clean(body.locationDetail, 200);
    const durationNote = clean(body.durationNote, 120);
    const message = clean(body.message, 800);
    const startRaw = clean(body.startDate, 12);
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startRaw) && !Number.isNaN(Date.parse(startRaw)) ? startRaw : null;

    if (!parentName || !phone) return json({ error: "missing_fields" }, 400);
    if (!/^\+?\d{9,15}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
    if (email && !EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);

    const adminHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

    // At most 3 requests per phone number per day, so the form cannot be used to flood the inbox.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recent = await fetch(
      `${SUPABASE_URL}/rest/v1/care_requests?phone=eq.${encodeURIComponent(phone)}&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: adminHeaders }
    );
    if (recent.ok && (await recent.json()).length >= 3) return json({ error: "too_many_requests" }, 429);

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/care_requests`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        parent_name: parentName, phone, email, service, shift, start_date: startDate, duration_note: durationNote,
        location_type: locationType, location_detail: locationDetail, message,
      }),
    });
    if (!ins.ok) return json({ error: "request_failed" }, 500);
    const row = (await ins.json())[0];

    const contact = await loadContactInfo(SUPABASE_URL, SERVICE_ROLE_KEY);
    const emails: OutgoingEmail[] = [];

    emails.push({
      to: ADMIN_EMAIL,
      subject: `New home care request: ${parentName} (${row.reference})`,
      replyTo: email || undefined,
      html: emailShell({
        eyebrow: "Action needed",
        heading: "New home care request",
        bodyHtml:
          paragraph("A parent asked for a nurse or caregiver on the website. Please call them back, then create their contract in the dashboard.") +
          detailsTable([
            ["Reference", row.reference],
            ["Parent", parentName],
            ["Phone", phone],
            ["Email", email || "Not given"],
            ["Service", SERVICE_LABEL[service]],
            ["Shift", SHIFT_LABEL[shift]],
            ["Start date", startDate ?? "Not given"],
            ["How long", durationNote || "Not given"],
            ["Where", `${locationType === "hospital" ? "Hospital" : "Home"}${locationDetail ? `: ${locationDetail}` : ""}`],
            ["Message", message || "None"],
          ]) +
          `<p style="margin:0;color:#64748B;font-size:13px">Open the <a href="${SITE_URL}/dashboard/care" style="color:#0A6070;text-decoration:underline">Home Care dashboard</a> to create the contract.</p>`,
      }),
    });

    if (email) {
      emails.push({
        to: email,
        subject: `We have received your request (${row.reference})`,
        replyTo: contact.email,
        html: emailShell({
          eyebrow: "Request received",
          heading: "Thank you, we will call you soon",
          bodyHtml:
            paragraph(`Dear ${parentName},`) +
            paragraph("We have received your request for home care support. A member of the Voice of Preemies team will phone you on the number you gave us to talk through your needs, the days and shifts you want, and to match you with a suitable nurse or caregiver.") +
            detailsTable([["Reference", row.reference], ["Service", SERVICE_LABEL[service]], ["Shift", SHIFT_LABEL[shift]]]) +
            paragraph(`If you would rather speak to us now, call ${CARE_PHONE}.`, true),
        }),
      });
    }

    const sent = await sendEmails(RESEND_API_KEY, emails);
    return json({ success: true, reference: row.reference, confirmationEmailSent: email ? sent[1] === true : false });
  } catch (err) {
    return json({ error: "request_failed", detail: String(err) }, 500);
  }
});
