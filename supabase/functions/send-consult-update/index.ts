import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuthenticatedUser } from "../_shared/security.ts";
import {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return json({ error: "Server not fully configured" }, 500);
    }

    // Only a logged-in dashboard admin may trigger these emails.
    const caller = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
    if (!caller) return json({ error: "Authentication required" }, 401);

    const { bookingId, action } = await req.json();
    if (typeof bookingId !== "string" || (action !== "confirmed" && action !== "cancelled")) {
      return json({ error: "bookingId and a valid action are required" }, 400);
    }

    const adminHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };
    const bookingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/consult_bookings?id=eq.${encodeURIComponent(bookingId)}&select=*,consult_providers(title,full_name,notify_email)`,
      { headers: adminHeaders }
    );
    const rows = bookingRes.ok ? await bookingRes.json() : [];
    const row = rows[0];
    if (!row) return json({ error: "Booking not found" }, 404);

    // The email content comes from the database, never from the request, and
    // we only announce a state the booking is actually in.
    if (row.status !== action) return json({ error: "status_mismatch" }, 409);

    const booking: BookingRow = row;
    const provider: ProviderRow = row.consult_providers ?? { title: "", full_name: "your provider", notify_email: null };
    const contact = await loadContactInfo(SUPABASE_URL, SERVICE_ROLE_KEY);

    const who = providerName(provider);
    const dateStr = formatDate(booking.starts_at);
    const timeStr = formatTime(booking.starts_at);
    const balance = Math.max(booking.full_fee - booking.booking_fee, 0);

    const emails: OutgoingEmail[] = [];

    if (action === "confirmed") {
      const howItWorks =
        booking.mode === "in_person"
          ? `Please come to the Voice of Preemies office (${contact.address}) a few minutes before ${timeStr}.`
          : `${who} will call you on ${booking.phone} at ${timeStr}. Please keep your phone nearby and charged.`;

      emails.push({
        to: booking.email,
        subject: `Your consultation is confirmed: ${dateStr}, ${timeStr}`,
        replyTo: contact.email,
        html: emailShell({
          eyebrow: "Booking confirmed",
          heading: "Your consultation is confirmed",
          bodyHtml:
            paragraph(`Dear ${booking.parent_name},`) +
            paragraph("Your payment has been verified and your consultation is confirmed.") +
            detailsTable([
              ["Reference", booking.reference],
              ["Provider", who],
              ["Date", dateStr],
              ["Time", `${timeStr} (Kigali time)`],
              ["Consultation", modeLabel(booking.mode, contact)],
              ["Booking fee received", formatFee(booking.booking_fee)],
              ["Balance due after the consultation", formatFee(balance)],
            ]) +
            paragraph(howItWorks) +
            paragraph(
              "This service is not for emergencies. If your baby is in danger or needs urgent care, go to the nearest hospital immediately.",
              true
            ) +
            contactLine(contact),
        }),
      });

      if (provider.notify_email) {
        emails.push({
          to: provider.notify_email,
          subject: `Confirmed: ${dateStr}, ${timeStr} with ${booking.parent_name}`,
          html: emailShell({
            eyebrow: "Booking confirmed",
            heading: "A consultation is confirmed",
            bodyHtml: detailsTable([
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
    } else {
      emails.push({
        to: booking.email,
        subject: `Your booking has been cancelled (${booking.reference})`,
        replyTo: contact.email,
        html: emailShell({
          eyebrow: "Booking cancelled",
          heading: "Your booking has been cancelled",
          bodyHtml:
            paragraph(`Dear ${booking.parent_name},`) +
            paragraph(
              `Your consultation booking with ${who} on ${dateStr} at ${timeStr} has been cancelled. If you already paid the booking fee, please contact us and we will sort out your refund or rebook you.`
            ) +
            detailsTable([
              ["Reference", booking.reference],
              ["Provider", who],
              ["Date", dateStr],
              ["Time", `${timeStr} (Kigali time)`],
            ]) +
            contactLine(contact),
        }),
      });

      if (provider.notify_email) {
        emails.push({
          to: provider.notify_email,
          subject: `Cancelled: ${dateStr}, ${timeStr} with ${booking.parent_name}`,
          html: emailShell({
            eyebrow: "Booking cancelled",
            heading: "A booking was cancelled",
            bodyHtml: detailsTable([
              ["Date", dateStr],
              ["Time", `${timeStr} (Kigali time)`],
              ["Parent", booking.parent_name],
            ]),
          }),
        });
      }
    }

    const sent = await sendEmails(RESEND_API_KEY, emails);
    return json({ success: true, parentEmailSent: sent[0] === true });
  } catch (err) {
    return json({ error: "Failed to send consultation update", detail: String(err) }, 500);
  }
});
