/*
  # Site settings — single source of truth for org contact info + social links

  ## Why
  The dashboard's Settings page has never actually been wired to anything
  (pure local `useState`, nothing ever saved), while the real phone/email/
  address were hardcoded directly into JSX in three separate places
  (Footer.tsx, Contact.tsx, GetSupport.tsx) — no single source of truth, and
  they've already drifted out of sync (the Settings page showed a different
  phone number than the real one in the Footer). This creates one real place
  this information lives, editable from the dashboard, read everywhere else.

  ## Design
  Single-row table, not key-value pairs — there's exactly one org. Seeded
  with today's real values so nothing changes on the public site until the
  admin edits something. Social URLs start empty; the Footer will only show
  an icon for a platform once its URL is actually set.

  ## Security
  - anon: SELECT only (Footer/Contact/GetSupport are public pages and need
    to read this)
  - authenticated: SELECT and UPDATE (dashboard Settings page)
  - No INSERT/DELETE policy at all — this is a fixed single row that only
    ever gets updated, never created or removed via the app.
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL DEFAULT '',
  org_email text NOT NULL DEFAULT '',
  org_phone text NOT NULL DEFAULT '',
  org_address text NOT NULL DEFAULT '',
  facebook_url text NOT NULL DEFAULT '',
  instagram_url text NOT NULL DEFAULT '',
  twitter_url text NOT NULL DEFAULT '',
  youtube_url text NOT NULL DEFAULT '',
  default_currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_site_settings" ON site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "authenticated_update_site_settings" ON site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO site_settings (org_name, org_email, org_phone, org_address)
VALUES ('Voice of Preemies Rwanda', 'voiceofpreemies@gmail.com', '+250799534956', 'Kigali, Rwanda');
