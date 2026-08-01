import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const email = (body.email ?? url.searchParams.get("email") ?? "").trim().toLowerCase();
    const token = body.token ?? url.searchParams.get("token") ?? "";

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "email and token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifyUnsubscribeToken(email, token, RESEND_API_KEY);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid or expired unsubscribe link" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/email_unsubscribes`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail);
    }

    return new Response(JSON.stringify({ success: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to unsubscribe", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
