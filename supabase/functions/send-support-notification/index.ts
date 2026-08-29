import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { escapeHtml, pgEqOrNull } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupportRequest {
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  support_type?: string | null;
  note?: string | null;
}

const ADMIN_EMAIL = "voiceofpreemies@gmail.com";
const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";

function buildAdminEmail(d: SupportRequest): string {
  const rows: [string, string][] = [
    ["Name", d.name],
    ["Phone", d.phone],
  ];
  if (d.email) rows.push(["Email", d.email]);
  if (d.role) rows.push(["Role", d.role]);
  if (d.support_type) rows.push(["Support Needed", d.support_type]);
  if (d.note) rows.push(["Note", d.note]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 14px;font-weight:600;color:#0A6070;border-bottom:1px solid #E2E8F0;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 14px;color:#334155;border-bottom:1px solid #E2E8F0;word-break:break-word">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#E8644A,#F0A500);padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">New Support Request</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 6px;color:#64748B;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Request Details</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 24px;border:1px solid #E2E8F0;border-radius:8px">
        ${tableRows}
      </table>
      <p style="margin:0;color:#64748B;font-size:13px">You can view this request in the <a href="https://voiceofpreemies.org/dashboard/contact" style="color:#0A6070;text-decoration:underline">dashboard</a>.</p>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationEmail(d: SupportRequest): string {
  const firstName = d.name.split(" ")[0];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#E8644A,#F0A500);padding:32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 12px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px;color:#fff">&#10084;</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">We're Here for You, ${escapeHtml(firstName)}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px">Your support request has been received</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">We have received your request${d.support_type ? ` for <strong>${escapeHtml(d.support_type)}</strong>` : ""} and our team will reach out to you within 24 hours.</p>
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin:0 0 20px">
        <p style="margin:0;color:#92400E;font-size:14px;line-height:1.5"><strong>What happens next?</strong><br>One of our support team members will contact you by phone${d.email ? " or email" : ""} to discuss how we can best help you and your family.</p>
      </div>
      <p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">If you need urgent assistance, please call us directly at <strong>+250 799 534 956</strong> or email <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>
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
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: SupportRequest = await req.json();

    // Refuse to send unless this matches a support request actually just
    // submitted through the public form — prevents this endpoint being used as
    // an open relay to send arbitrary spoofed email.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const checkUrl = `${SUPABASE_URL}/rest/v1/support_requests?select=id`
      + pgEqOrNull("name", data.name)
      + pgEqOrNull("phone", data.phone)
      + `&created_at=gte.${encodeURIComponent(since)}&deleted_at=is.null&limit=1`;
    const checkRes = await fetch(checkUrl, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    const matches = checkRes.ok ? await checkRes.json() : [];
    if (!Array.isArray(matches) || matches.length === 0) {
      return new Response(JSON.stringify({ error: "No matching support request found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendEmail = (payload: Record<string, unknown>) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

    const promises: Promise<Response>[] = [
      sendEmail({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Support Request: ${data.name}${data.support_type ? ` — ${data.support_type}` : ""}`,
        html: buildAdminEmail(data),
      }),
    ];
    const labels = ["admin"];

    if (data.email) {
      promises.push(
        sendEmail({
          from: FROM_EMAIL,
          to: [data.email],
          subject: "We've received your support request — Voice of Preemies",
          html: buildConfirmationEmail(data),
        })
      );
      labels.push("requester");
    }

    const results = await Promise.allSettled(promises);
    const summary = results.map((r, i) => ({
      email: labels[i],
      status: r.status,
      ...(r.status === "fulfilled" ? { httpStatus: r.value.status } : { reason: String(r.reason) }),
    }));

    return new Response(JSON.stringify({ success: true, emails: summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to send notifications", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
