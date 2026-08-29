import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { escapeHtml, pgEqOrNull } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface JoinRequest {
  full_name: string;
  email?: string | null;
  phone: string;
  role: string;
  organization?: string;
  expertise?: string;
  motivation?: string;
  how_heard?: string;
}

const ADMIN_EMAIL = "voiceofpreemies@gmail.com";
const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";

function buildAdminEmail(data: JoinRequest): string {
  const rows: [string, string][] = [
    ["Name", data.full_name],
    ["Phone", data.phone],
    ["Role", data.role],
  ];
  if (data.email) rows.splice(1, 0, ["Email", data.email]);
  if (data.organization) rows.push(["Organization", data.organization]);
  if (data.expertise) rows.push(["Expertise", data.expertise]);
  if (data.motivation) rows.push(["Message", data.motivation]);
  if (data.how_heard) rows.push(["How They Heard", data.how_heard]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 14px;font-weight:600;color:#0A6070;border-bottom:1px solid #E2E8F0;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 14px;color:#334155;border-bottom:1px solid #E2E8F0">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">New Community Join Request</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 6px;color:#64748B;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Applicant Details</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 24px;border:1px solid #E2E8F0;border-radius:8px">
        ${tableRows}
      </table>
      <p style="margin:0;color:#64748B;font-size:13px">You can review this request in the <a href="https://voiceofpreemies.org/dashboard/join-requests" style="color:#0A6070;text-decoration:underline">dashboard</a>.</p>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationEmail(data: JoinRequest): string {
  const firstName = data.full_name.split(" ")[0];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 12px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px;color:#fff">&#10003;</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Welcome, ${escapeHtml(firstName)}!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Thank you for joining Voice of Preemies</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">We are thrilled that you want to be part of our community as <strong>${escapeHtml(data.role)}</strong>. Your willingness to contribute means the world to the families we serve.</p>
      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:16px 20px;margin:0 0 20px">
        <p style="margin:0;color:#0F766E;font-size:14px;line-height:1.5"><strong>What happens next?</strong><br>Our team will review your request and reach out to you within a few days. We look forward to welcoming you aboard!</p>
      </div>
      <p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">If you have any questions in the meantime, feel free to reach out at <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>
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

    const data: JoinRequest = await req.json();

    // This function is shared by two public forms (community join requests and
    // team/job applications), so check either source table for a matching row
    // submitted in the last 15 minutes before sending — prevents this endpoint
    // being used as an open relay to send arbitrary spoofed email.
    const svcHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [joinRes, teamRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/join_requests?select=id`
          + pgEqOrNull("full_name", data.full_name)
          + pgEqOrNull("phone", data.phone)
          + `&created_at=gte.${encodeURIComponent(since)}&deleted_at=is.null&limit=1`,
        { headers: svcHeaders }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/team_applications?select=id`
          + pgEqOrNull("full_name", data.full_name)
          + pgEqOrNull("phone", data.phone)
          + `&created_at=gte.${encodeURIComponent(since)}&limit=1`,
        { headers: svcHeaders }
      ),
    ]);
    const joinMatches = joinRes.ok ? await joinRes.json() : [];
    const teamMatches = teamRes.ok ? await teamRes.json() : [];
    const hasMatch = (Array.isArray(joinMatches) && joinMatches.length > 0) || (Array.isArray(teamMatches) && teamMatches.length > 0);
    if (!hasMatch) {
      return new Response(JSON.stringify({ error: "No matching submission found" }), {
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

    const adminPayload = {
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `New Join Request: ${data.full_name} — ${data.role}`,
      html: buildAdminEmail(data),
    };

    const promises: Promise<Response>[] = [sendEmail(adminPayload)];
    const labels = ["admin"];

    if (data.email) {
      promises.push(
        sendEmail({
          from: FROM_EMAIL,
          to: [data.email],
          subject: "Welcome to Voice of Preemies!",
          html: buildConfirmationEmail(data),
        })
      );
      labels.push("applicant");
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
