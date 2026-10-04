import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ADMIN_EMAIL,
  SITE_URL,
  BookingRow,
  ProviderRow,
  contactLine,
  detailsTable,
  emailShell,
  formatDate,
  formatFee,
  formatTime,
  loadContactInfo,
  modeLabel,
  paragraph,
  providerName,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Server not fully configured" }, 500);
    }

    const body = await req.json();

    // Honeypot: real visitors never fill this hidden field.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ success: true, reference: "VOP-000000" });
    }

    const providerId = clean(body.providerId, 64);
    const startsAt = clean(body.startsAt, 40);
    const mode = body.mode === "in_person" ? "in_person" : body.mode === "call" ? "call" : "";
    const parentName = clean(body.parentName, 100);
    const phone = clean(body.phone, 30).replace(/[\s-]/g, "");
    const email = clean(body.email, 150).toLowerCase();
    const topic = clean(body.topic, 600);
    const babyAge = clean(body.babyAge, 60);
    const payerName = clean(body.payerName, 100);

    if (!providerId || !startsAt || !mode || !parentName || !phone || !email || !payerName) {
      return json({ error: "missing_fields" }, 400);
    }
    if (!/^\+?\d{9,15}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);
    if (Number.isNaN(Date.parse(startsAt))) return json({ error: "invalid_time" }, 400);

    const adminHeaders = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consult_create_booking`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        p_provider: providerId,
        p_starts_at: new Date(startsAt).toISOString(),
        p_mode: mode,
        p_parent_name: parentName,
        p_phone: phone,
        p_email: email,
        p_topic: topic,
        p_baby_age: babyAge,
        p_payer_name: payerName,
      }),
    });

    if (!rpcRes.ok) {
      const err = await rpcRes.json().catch(() => ({}));
      const msg = String(err?.message ?? "");
      if (msg.includes("slot_unavailable") || err?.code === "23505") return json({ error: "slot_unavailable" }, 409);
      if (msg.includes("too_many_pending")) return json({ error: "too_many_pending" }, 429);
      if (msg.includes("provider_unavailable")) return json({ error: "provider_unavailable" }, 404);
      return json({ error: "booking_failed" }, 500);
    }

    const rpcBody = await rpcRes.json();
    const booking: BookingRow = Array.isArray(rpcBody) ? rpcBody[0] : rpcBody;

    const provRes = await fetch(
      `${SUPABASE_URL}/rest/v1/consult_providers?id=eq.${encodeURIComponent(booking.provider_id)}&select=title,full_name,notify_email`,
      { headers: adminHeaders }
    );
    const provRows: ProviderRow[] = provRes.ok ? await provRes.json() : [];
    const provider: ProviderRow = provRows[0] ?? { title: "", full_name: "your provider", notify_email: null };
    const contact = await loadContactInfo(SUPABASE_URL, SERVICE_ROLE_KEY);

    const who = providerName(provider);
    const dateStr = formatDate(booking.starts_at);
    const timeStr = formatTime(booking.starts_at);
    const balance = Math.max(booking.full_fee - booking.booking_fee, 0);

    const emails: OutgoingEmail[] = [];

    // 1. Parent: booking received
    emails.push({
      to: booking.email,
      subject: `We've received your booking (${booking.reference})`,
      replyTo: contact.email,
      html: emailShell({
        eyebrow: "Booking received",
        heading: "Thank you for booking",
        bodyHtml:
          paragraph(`Dear ${booking.parent_name},`) +
          paragraph(
            "We have received your consultation booking. Your slot is held for 24 hours while we verify your MoMo payment, and you will get a second email as soon as it is confirmed."
          ) +
          detailsTable([
            ["Reference", booking.reference],
            ["Provider", who],
            ["Date", dateStr],
            ["Time", `${timeStr} (Kigali time)`],
            ["Consultation", modeLabel(booking.mode, contact)],
            ["Booking fee paid now", formatFee(booking.booking_fee)],
            ["Balance after consultation", formatFee(balance)],
          ]) +
          contactLine(contact),
      }),
    });

    // 2. Admin: new booking alert
    emails.push({
      to: ADMIN_EMAIL,
      subject: `New consultation booking: ${booking.parent_name} with ${who} (${booking.reference})`,
      replyTo: booking.email,
      html: emailShell({
        eyebrow: "Action needed",
        heading: "New consultation booking",
        bodyHtml:
          paragraph(
            `Check MoMo for ${formatFee(booking.booking_fee)} paid under the name "${booking.payer_name}", then confirm the booking in the dashboard.`
          ) +
          detailsTable([
            ["Reference", booking.reference],
            ["Provider", who],
            ["Date", dateStr],
            ["Time", `${timeStr} (Kigali time)`],
            ["Consultation", modeLabel(booking.mode, contact)],
            ["Parent", booking.parent_name],
            ["Phone", booking.phone],
            ["Email", booking.email],
            ["Baby's age", booking.baby_age || "Not given"],
            ["Topic", booking.topic || "Not given"],
            ["MoMo payer name", booking.payer_name],
            ["Booking fee", formatFee(booking.booking_fee)],
          ]) +
          `<p style="margin:0;color:#64748B;font-size:13px">Open the <a href="${SITE_URL}/dashboard/consultations" style="color:#0A6070;text-decoration:underline">dashboard</a> to confirm.</p>`,
      }),
    });

    // 3. Provider heads-up (only if an email is set)
    if (provider.notify_email) {
      emails.push({
        to: provider.notify_email,
        subject: `New booking request: ${dateStr}, ${timeStr}`,
        html: emailShell({
          eyebrow: "New booking request",
          heading: "A parent has booked a consultation",
          bodyHtml:
            paragraph("This booking is awaiting payment verification. You will be told once it is confirmed.") +
            detailsTable([
              ["Date", dateStr],
              ["Time", `${timeStr} (Kigali time)`],
              ["Consultation", modeLabel(booking.mode, contact)],
              ["Parent", booking.parent_name],
              ["Phone", booking.phone],
              ["Baby's age", booking.baby_age || "Not given"],
              ["Topic", booking.topic || "Not given"],
            ]),
        }),
      });
    }

    const sent = await sendEmails(RESEND_API_KEY, emails);

    return json({
      success: true,
      reference: booking.reference,
      startsAt: booking.starts_at,
      providerName: who,
      parentEmailSent: sent[0] === true,
    });
  } catch (err) {
    return json({ error: "booking_failed", detail: String(err) }, 500);
  }
});
