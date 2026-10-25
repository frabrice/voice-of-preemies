import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuthenticatedUser, escapeHtml } from "../_shared/security.ts";
import { FROM_EMAIL, SITE_URL, emailShell, paragraph, detailsTable } from "../_shared/consult.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["super_admin", "admin", "content_manager", "finance_manager", "database_manager", "support_agent", "event_coordinator"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD = 8;

class Fail extends Error {
  constructor(public status: number, message: string) { super(message); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return json({ error: "Server not fully configured" }, 500);

  const admin = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...admin, Prefer: "return=representation", ...(init.headers ?? {}) } });
  const auth = (path: string, init: RequestInit = {}) =>
    fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, { ...init, headers: { ...admin, ...(init.headers ?? {}) } });

  try {
    const caller = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
    if (!caller) throw new Fail(401, "Please sign in again.");

    // Only an active super admin may manage users. Checked against the database, never the request.
    const roleRes = await rest(`user_roles?user_id=eq.${caller.id}&select=role,status`);
    const me = (roleRes.ok ? await roleRes.json() : [])[0];
    if (!me || me.role !== "super_admin" || me.status !== "active") throw new Fail(403, "Only a Super Admin can manage users.");

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const log = (act: string, entityId: string, details: Record<string, unknown>) =>
      rest("user_activity_log", {
        method: "POST",
        body: JSON.stringify({ user_id: caller.id, user_email: caller.email, action: act, entity_type: "user", entity_id: entityId, details }),
      });
    const loadRoles = async (): Promise<any[]> => {
      const r = await rest("user_roles?select=*&order=created_at.desc");
      return r.ok ? await r.json() : [];
    };
    const activeSuperAdmins = (rows: any[]) => rows.filter(r => r.role === "super_admin" && r.status === "active");
    const target = async (): Promise<any> => {
      const id = body?.userId;
      if (typeof id !== "string" || !UUID_RE.test(id)) throw new Fail(400, "Invalid user.");
      const r = await rest(`user_roles?user_id=eq.${id}&select=*`);
      const row = (r.ok ? await r.json() : [])[0];
      if (!row) throw new Fail(404, "That user was not found.");
      return row;
    };
    const checkPassword = (pw: unknown): string => {
      if (typeof pw !== "string" || pw.length < MIN_PASSWORD) throw new Fail(400, `The password must be at least ${MIN_PASSWORD} characters.`);
      if (pw.length > 72) throw new Fail(400, "The password is too long (72 characters maximum).");
      return pw;
    };

    /* list: roles plus last sign-in from the auth system */
    if (action === "list") {
      const rows = await loadRoles();
      const lastSeen: Record<string, string | null> = {};
      const listRes = await auth("users?per_page=200");
      if (listRes.ok) {
        const data = await listRes.json();
        for (const u of data.users ?? []) lastSeen[u.id] = u.last_sign_in_at ?? null;
      }
      return json({ users: rows.map(r => ({ ...r, last_sign_in_at: lastSeen[r.user_id] ?? null })) });
    }

    /* create */
    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const displayName = String(body.displayName ?? "").trim().slice(0, 80);
      const role = String(body.role ?? "");
      const password = checkPassword(body.password);
      if (!EMAIL_RE.test(email)) throw new Fail(400, "Please enter a valid email address.");
      if (!displayName) throw new Fail(400, "Please enter the person's name.");
      if (!ROLES.includes(role)) throw new Fail(400, "Please choose a valid role.");

      const existing = await rest(`user_roles?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.ok && (await existing.json()).length) throw new Fail(409, "A user with that email already exists.");

      const created = await auth("users", {
        method: "POST",
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: displayName } }),
      });
      const createdBody = await created.json().catch(() => ({}));
      if (!created.ok) {
        const msg = String(createdBody?.msg ?? createdBody?.message ?? createdBody?.error_description ?? "");
        if (/already|registered|exists/i.test(msg)) throw new Fail(409, "That email already has a login.");
        throw new Fail(400, msg || "Could not create the login.");
      }
      const userId: string = createdBody.id;

      const ins = await rest("user_roles", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, email, role, display_name: displayName, status: "active", created_by: caller.id }),
      });
      if (!ins.ok) {
        await auth(`users/${userId}`, { method: "DELETE" }); // never leave a login without a role
        throw new Fail(500, "Could not save the new user's role. Nothing was created.");
      }

      let emailSent = false;
      if (body.sendEmail && RESEND_API_KEY) {
        const html = emailShell({
          eyebrow: "Voice of Preemies",
          heading: "Your dashboard account is ready",
          bodyHtml:
            paragraph(`Hello ${displayName}, an account has been created for you on the Voice of Preemies admin dashboard.`) +
            detailsTable([["Sign in at", `${SITE_URL}/dashboard/login`], ["Email", email], ["Temporary password", password], ["Role", role.replace(/_/g, " ")]]) +
            paragraph("Please sign in and change your password straight away, using the key icon at the bottom of the left menu.", true) +
            `<p style="margin:0 0 8px"><a href="${escapeHtml(SITE_URL)}/dashboard/login" style="display:inline-block;background:#0A6070;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">Sign in to the dashboard</a></p>`,
        });
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject: "Your Voice of Preemies dashboard account", html }),
        });
        emailSent = sent.ok;
      }

      await log("create_user", userId, { email, role });
      return json({ ok: true, userId, emailSent }, 201);
    }

    /* set_role */
    if (action === "set_role") {
      const row = await target();
      const role = String(body.role ?? "");
      if (!ROLES.includes(role)) throw new Fail(400, "Please choose a valid role.");
      if (row.user_id === caller.id && role !== "super_admin") throw new Fail(400, "You cannot remove your own Super Admin access.");
      if (row.role === "super_admin" && role !== "super_admin" && activeSuperAdmins(await loadRoles()).length <= 1)
        throw new Fail(400, "There must always be at least one active Super Admin.");
      const r = await rest(`user_roles?user_id=eq.${row.user_id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      if (!r.ok) throw new Fail(500, "Could not change the role.");
      await log("change_role", row.user_id, { email: row.email, from: row.role, to: role });
      return json({ ok: true });
    }

    /* set_status: suspend or reactivate (also blocks the login itself) */
    if (action === "set_status") {
      const row = await target();
      const status = body.status === "suspended" ? "suspended" : body.status === "active" ? "active" : null;
      if (!status) throw new Fail(400, "Invalid status.");
      if (status === "suspended") {
        if (row.user_id === caller.id) throw new Fail(400, "You cannot suspend your own account.");
        if (row.role === "super_admin" && activeSuperAdmins(await loadRoles()).length <= 1)
          throw new Fail(400, "There must always be at least one active Super Admin.");
      }
      const ban = await auth(`users/${row.user_id}`, { method: "PUT", body: JSON.stringify({ ban_duration: status === "suspended" ? "876000h" : "none" }) });
      if (!ban.ok) throw new Fail(500, "Could not update the login.");
      const r = await rest(`user_roles?user_id=eq.${row.user_id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (!r.ok) throw new Fail(500, "Could not update the status.");
      await log(status === "suspended" ? "suspend_user" : "activate_user", row.user_id, { email: row.email });
      return json({ ok: true });
    }

    /* set_password */
    if (action === "set_password") {
      const row = await target();
      const password = checkPassword(body.password);
      const r = await auth(`users/${row.user_id}`, { method: "PUT", body: JSON.stringify({ password }) });
      if (!r.ok) throw new Fail(400, "Could not set that password. Try a longer or less common one.");
      await log("reset_password", row.user_id, { email: row.email });
      return json({ ok: true });
    }

    /* delete */
    if (action === "delete") {
      const row = await target();
      if (row.user_id === caller.id) throw new Fail(400, "You cannot delete your own account.");
      if (row.role === "super_admin" && row.status === "active" && activeSuperAdmins(await loadRoles()).length <= 1)
        throw new Fail(400, "There must always be at least one active Super Admin.");
      const r = await auth(`users/${row.user_id}`, { method: "DELETE" });
      if (!r.ok) throw new Fail(500, "Could not delete that user.");
      await log("delete_user", row.user_id, { email: row.email });
      return json({ ok: true });
    }

    throw new Fail(400, "Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error("manage-admin-user failed", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
