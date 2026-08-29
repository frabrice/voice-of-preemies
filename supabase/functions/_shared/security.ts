// Shared security helpers for the notification edge functions.

/** Escapes text before it's interpolated into an HTML email template, to prevent
 *  a form submission from breaking the email's markup or injecting unwanted content. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds a PostgREST filter fragment that correctly matches NULL for empty/missing
 *  values (PostgREST's `eq.` never matches NULL, even against an empty string). */
export function pgEqOrNull(column: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return `&${column}=is.null`;
  return `&${column}=eq.${encodeURIComponent(v)}`;
}

/**
 * Verifies the request's Authorization bearer token belongs to a real, currently
 * logged-in dashboard user (not just the public anon key, which anyone can read
 * out of the client bundle). Used to gate functions that have no legitimate
 * anonymous/public caller, e.g. the publish-notification broadcast.
 */
export async function requireAuthenticatedUser(
  req: Request,
  supabaseUrl: string,
  anonKey: string
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === anonKey) return null;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id) return null;
  return { id: user.id, email: user.email };
}
