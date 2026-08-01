import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactMessage {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

const ADMIN_EMAIL = "voiceofpreemies@gmail.com";
const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";

function buildAdminEmail(d: ContactMessage): string {
  const rows: [string, string][] = [
    ["Name", d.name],
    ["Email", d.email],
    ["Subject", d.subject],
  ];
  if (d.phone) rows.splice(2, 0, ["Phone", d.phone]);
  rows.push(["Message", d.message]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 14px;font-weight:600;color:#0A6070;border-bottom:1px solid #E2E8F0;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:10px 14px;color:#334155;border-bottom:1px solid #E2E8F0;word-break:break-word">${value}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">New Contact Message</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 6px;color:#64748B;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Message Details</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 24px;border:1px solid #E2E8F0;border-radius:8px">
        ${tableRows}
      </table>
      <p style="margin:0;color:#64748B;font-size:13px">You can view this message in the <a href="https://voiceofpreemies.org/dashboard/contact" style="color:#0A6070;text-decoration:underline">dashboard</a>.</p>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationEmail(d: ContactMessage): string {
  const firstName = d.name.split(" ")[0];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 12px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px;color:#fff">&#10003;</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Message Received, ${firstName}!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px">Thank you for reaching out to us</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">We've received your message regarding <strong>${d.subject}</strong> and our team will get back to you within 1–2 business days.</p>
      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:16px 20px;margin:0 0 20px">
        <p style="margin:0;color:#0F766E;font-size:14px;line-height:1.5"><strong>Your message:</strong><br>${d.message}</p>
      </div>
      <p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">In the meantime, feel free to call us or reach out at <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>
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
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: ContactMessage = await req.json();

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
        subject: `New Contact Message: ${data.name} — ${data.subject}`,
        html: buildAdminEmail(data),
      }),
      sendEmail({
        from: FROM_EMAIL,
        to: [data.email],
        subject: "We received your message — Voice of Preemies",
        html: buildConfirmationEmail(data),
      }),
    ];

    const results = await Promise.allSettled(promises);
    const labels = ["admin", "sender"];
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
