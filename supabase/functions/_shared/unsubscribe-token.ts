// Shared by send-publication-notification and unsubscribe-email.
// Signs/verifies unsubscribe links using the already-configured RESEND_API_KEY
// as the HMAC secret, so no separate secret needs to be managed for this.

export async function makeUnsubscribeToken(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyUnsubscribeToken(email: string, token: string, secret: string): Promise<boolean> {
  const expected = await makeUnsubscribeToken(email, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
