import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { escapeHtml, requireAuthenticatedUser } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegistrationPayload {
  email: string;
  primaryName: string;
  partnerName?: string | null;
  registrationType: "individual" | "couple";
  amount: number;
}

const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";
const EVENT_TITLE = "Mental Health Open Day";
const EVENT_DATE = "Sunday, 27 September 2026";
const EVENT_TIME = "1:00 PM – 5:00 PM";
const EVENT_VENUE = "Beau Séjour Hotel, Kigali";

function buildEmail(d: RegistrationPayload): string {
  const names = d.registrationType === "couple" && d.partnerName
    ? `${escapeHtml(d.primaryName)} & ${escapeHtml(d.partnerName)}`
    : escapeHtml(d.primaryName);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:28px 32px;text-align:center">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Registration Confirmed</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${EVENT_TITLE}</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">Dear ${names},</p>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6">
        Your payment has been confirmed and your spot${d.registrationType === "couple" ? "s are" : " is"} reserved for the ${EVENT_TITLE}. We look forward to seeing you there.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tr><td style="padding:6px 0;color:#64748B;font-size:13px;width:110px">Date</td><td style="padding:6px 0;color:#1E293B;font-size:14px;font-weight:600">${EVENT_DATE}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:13px">Time</td><td style="padding:6px 0;color:#1E293B;font-size:14px;font-weight:600">${EVENT_TIME}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:13px">Location</td><td style="padding:6px 0;color:#1E293B;font-size:14px;font-weight:600">${EVENT_VENUE}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:13px">Registration</td><td style="padding:6px 0;color:#1E293B;font-size:14px;font-weight:600">${d.registrationType === "couple" ? "Couple" : "Individual"} — ${d.amount.toLocaleString()} RWF</td></tr>
      </table>
      <p style="margin:0;color:#64748B;font-size:13px;line-height:1.6">If anything about your registration looks incorrect, just reply to this email.</p>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only ever triggered by an admin clicking "Mark as Paid" in the dashboard —
    // there is no legitimate anonymous caller for this, so it requires a real
    // logged-in session (the public anon key alone is not enough).
    const caller = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: RegistrationPayload = await req.json();
    if (!data.email || !data.primaryName || !data.registrationType || !data.amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [data.email],
        subject: `You're confirmed — ${EVENT_TITLE}`,
        html: buildEmail(data),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Resend failed: ${detail}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to send registration confirmation", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
