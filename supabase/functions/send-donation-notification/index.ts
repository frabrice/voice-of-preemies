import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { escapeHtml, pgEqOrNull } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DonationNotification {
  type: "cash" | "inkind" | "commitment";
  donor_name: string;
  donor_email?: string | null;
  donor_phone?: string | null;
  // cash-specific
  amount?: number | null;
  currency?: string | null;
  frequency?: string | null;
  // inkind-specific
  items_description?: string | null;
  items_value_estimate?: number | null;
  logistics_mode?: "dropoff" | "pickup" | null;
  pickup_address?: string | null;
  notes?: string | null;
  anonymous?: boolean;
}

const ADMIN_EMAIL = "voiceofpreemies@gmail.com";
const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";

function buildAdminEmail(d: DonationNotification): string {
  const rows: [string, string][] = [];
  if (!d.anonymous) rows.push(["Donor", d.donor_name]);
  else rows.push(["Donor", "Anonymous"]);
  if (d.donor_email) rows.push(["Email", d.donor_email]);
  if (d.donor_phone) rows.push(["Phone", d.donor_phone]);

  if (d.type === "cash") {
    rows.push(["Donation Type", "Cash / Online"]);
    if (d.amount) rows.push(["Amount", `${d.currency ?? "USD"} ${d.amount}`]);
    if (d.frequency) rows.push(["Frequency", d.frequency === "monthly" ? "Monthly" : "One-time"]);
  } else if (d.type === "inkind") {
    rows.push(["Donation Type", "In-Kind"]);
    if (d.items_description) rows.push(["Items", d.items_description]);
    if (d.items_value_estimate) rows.push(["Est. Value", `$${d.items_value_estimate}`]);
    if (d.logistics_mode) rows.push(["Logistics", d.logistics_mode === "pickup" ? `Pickup from: ${d.pickup_address ?? ""}` : "Drop-off"]);
    if (d.notes) rows.push(["Notes", d.notes]);
  } else {
    rows.push(["Donation Type", "Future Pledge"]);
    if (d.notes) rows.push(["What they plan to donate", d.notes]);
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 14px;font-weight:600;color:#0A6070;border-bottom:1px solid #E2E8F0;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 14px;color:#334155;border-bottom:1px solid #E2E8F0;word-break:break-word">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  const title = d.type === "cash" ? "New Cash Donation" : d.type === "inkind" ? "New In-Kind Donation" : "New Donation Pledge";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#2D8A5F,#0A6070);padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${title}</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 6px;color:#64748B;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Donation Details</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 24px;border:1px solid #E2E8F0;border-radius:8px">
        ${tableRows}
      </table>
      <p style="margin:0;color:#64748B;font-size:13px">You can manage this donation in the <a href="https://voiceofpreemies.org/dashboard/donations" style="color:#0A6070;text-decoration:underline">dashboard</a>.</p>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildDonorThankYou(d: DonationNotification): string {
  const firstName = d.anonymous ? "Friend" : d.donor_name.split(" ")[0];

  const bodyText = d.type === "cash"
    ? `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">Your donation of <strong>${escapeHtml(d.currency ?? "USD")} ${escapeHtml(d.amount)}</strong>${d.frequency === "monthly" ? " per month" : ""} goes directly towards supporting premature babies and their families in Rwanda.</p>`
    : d.type === "inkind"
    ? `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">Your in-kind donation of <strong>${escapeHtml(d.items_description)}</strong> means so much to the families we serve. Every item donated helps a family in need.</p>`
    : `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">Thank you for committing to support premature babies and their families in Rwanda. Our team will reach out shortly to confirm the details.</p>`;

  const followUpText = d.type === "cash"
    ? `<p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">Our team will follow up with you shortly. If you have any questions, please reach out at <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>`
    : d.type === "inkind"
    ? `<p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">Our team will be in touch to coordinate ${d.logistics_mode === "pickup" ? "the pickup" : "your drop-off"}. If you have questions, reach out at <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>`
    : `<p style="margin:0;color:#64748B;font-size:14px;line-height:1.5">Our team will contact you shortly to confirm your donation and coordinate the details. If you have any questions, reach out at <a href="mailto:voiceofpreemies@gmail.com" style="color:#0A6070;text-decoration:underline">voiceofpreemies@gmail.com</a>.</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#2D8A5F,#0A6070);padding:32px;text-align:center">
      <div style="width:56px;height:56px;margin:0 auto 12px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center">
        <span style="font-size:28px;color:#fff">&#10084;</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Thank You, ${escapeHtml(firstName)}!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px">Your generosity makes a real difference</p>
    </div>
    <div style="padding:28px 32px">
      ${bodyText}
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:0 0 20px">
        <p style="margin:0;color:#166534;font-size:14px;line-height:1.5"><strong>Your impact:</strong><br>With your support, Voice of Preemies continues to provide emotional support, NICU guidance, peer connection, and advocacy for premature babies and their families across Rwanda.</p>
      </div>
      ${followUpText}
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

    const data: DonationNotification = await req.json();

    // Refuse to send unless this matches a donation record actually just
    // submitted through a public form — prevents this endpoint being used as
    // an open relay to send arbitrary spoofed email.
    const svcHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    let checkUrl: string;
    if (data.type === "cash") {
      checkUrl = `${SUPABASE_URL}/rest/v1/donation_records?select=id`
        + pgEqOrNull("donor_name", data.donor_name)
        + pgEqOrNull("amount", data.amount != null ? String(data.amount) : null)
        + pgEqOrNull("currency", data.currency ?? "USD")
        + `&created_at=gte.${encodeURIComponent(since)}&deleted_at=is.null&limit=1`;
    } else if (data.type === "inkind") {
      checkUrl = `${SUPABASE_URL}/rest/v1/in_kind_donations?select=id`
        + pgEqOrNull("donor_name", data.donor_name)
        + pgEqOrNull("items_description", data.items_description)
        + `&created_at=gte.${encodeURIComponent(since)}&deleted_at=is.null&limit=1`;
    } else {
      checkUrl = `${SUPABASE_URL}/rest/v1/donation_commitments?select=id`
        + pgEqOrNull("phone", data.donor_phone)
        + pgEqOrNull("email", data.donor_email)
        + `&created_at=gte.${encodeURIComponent(since)}&deleted_at=is.null&limit=1`;
    }
    const checkRes = await fetch(checkUrl, { headers: svcHeaders });
    const matches = checkRes.ok ? await checkRes.json() : [];
    if (!Array.isArray(matches) || matches.length === 0) {
      return new Response(JSON.stringify({ error: "No matching donation record found" }), {
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

    const adminSubject = data.type === "cash"
      ? `New Cash Donation: ${data.anonymous ? "Anonymous" : data.donor_name}${data.amount ? ` — ${data.currency ?? "USD"} ${data.amount}` : ""}`
      : data.type === "inkind"
      ? `New In-Kind Donation: ${data.anonymous ? "Anonymous" : data.donor_name}`
      : `New Donation Pledge: ${data.anonymous ? "Anonymous" : data.donor_name}`;

    const promises: Promise<Response>[] = [
      sendEmail({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: adminSubject,
        html: buildAdminEmail(data),
      }),
    ];
    const labels = ["admin"];

    const donorEmail = data.donor_email;
    if (donorEmail) {
      promises.push(
        sendEmail({
          from: FROM_EMAIL,
          to: [donorEmail],
          subject: "Thank you for your donation — Voice of Preemies",
          html: buildDonorThankYou(data),
        })
      );
      labels.push("donor");
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
