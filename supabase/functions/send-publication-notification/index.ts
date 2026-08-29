import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { makeUnsubscribeToken } from "../_shared/unsubscribe-token.ts";
import { escapeHtml, requireAuthenticatedUser } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PublicationPayload {
  type: "news" | "story" | "event";
  title: string;
  excerpt?: string | null;
  path?: string;
}

const FROM_EMAIL = "Voice of Preemies <no-reply@voiceofpreemies.org>";
const SITE_URL = "https://voiceofpreemies.org";
const TYPE_LABEL: Record<PublicationPayload["type"], string> = {
  news: "New Article",
  story: "New Story",
  event: "New Event",
};

function buildEmail(d: PublicationPayload, unsubscribeUrl: string): string {
  const label = TYPE_LABEL[d.type] ?? "New Publication";
  const link = `${SITE_URL}${d.path ?? "/publications"}`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#0A6070,#1AADA0);padding:28px 32px;text-align:center">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">${escapeHtml(label)}</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${escapeHtml(d.title)}</h1>
    </div>
    <div style="padding:28px 32px">
      ${d.excerpt ? `<p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6">${escapeHtml(d.excerpt)}</p>` : ""}
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#0A6070;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Read on our website</a>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0 0 6px;color:#94A3B8;font-size:12px">Voice of Preemies &mdash; Every baby deserves a fighting chance</p>
      <p style="margin:0;color:#B4C1CC;font-size:11px">You're receiving this because you've been in touch with us before. <a href="${unsubscribeUrl}" style="color:#94A3B8;text-decoration:underline">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not fully configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // This broadcasts to every contact in the database, so it must only ever be
    // triggered by a real logged-in dashboard admin — never by an anonymous caller
    // (the public anon key alone is not enough; anyone can read that out of the
    // client bundle).
    const caller = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: PublicationPayload = await req.json();
    if (!data.title || !data.type) {
      return new Response(JSON.stringify({ error: "title and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminHeaders = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    };

    const [contactsRes, unsubRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/all_contacts?select=email`, { headers: adminHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/email_unsubscribes?select=email`, { headers: adminHeaders }),
    ]);

    if (!contactsRes.ok) {
      const detail = await contactsRes.text();
      throw new Error(`Failed to load contacts: ${detail}`);
    }

    const contacts: { email: string }[] = await contactsRes.json();
    const unsubscribed: { email: string }[] = unsubRes.ok ? await unsubRes.json() : [];
    const unsubSet = new Set(unsubscribed.map((u) => u.email.toLowerCase()));
    const recipients = contacts.map((c) => c.email).filter((e) => e && !unsubSet.has(e.toLowerCase()));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, totalRecipients: 0, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batches = chunk(recipients, 100);
    let sent = 0;
    let failed = 0;

    for (const batch of batches) {
      const emails = await Promise.all(
        batch.map(async (email) => {
          const token = await makeUnsubscribeToken(email, RESEND_API_KEY);
          const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
          return {
            from: FROM_EMAIL,
            to: [email],
            subject: `${TYPE_LABEL[data.type] ?? "New Publication"}: ${data.title}`,
            html: buildEmail(data, unsubscribeUrl),
          };
        })
      );

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emails),
      });

      if (res.ok) sent += batch.length;
      else failed += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, totalRecipients: recipients.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to send publication notifications", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
