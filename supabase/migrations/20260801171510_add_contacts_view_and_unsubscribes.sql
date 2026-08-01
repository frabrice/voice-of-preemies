/*
  # Unified contact list + unsubscribe tracking

  ## Why
  The org wants everyone who has ever given an email address — donors, contact
  form senders, job applicants, volunteers, support requesters, event
  registrants, peer-support signups, in-kind/cash/pledge donors — to get
  notified when a new News article, Story, or Event is published. Rather than
  copying emails into a new table (which drifts out of sync as source tables
  change), this adds a VIEW that unions distinct emails live from every table
  that already collects one.

  ## New objects
  - `all_contacts` (view): one row per distinct email, with a representative
    name, the list of tables it was found in, and the earliest time it was
    seen. Always current — no sync job needed.
  - `email_unsubscribes` (table): opt-out list. "Who to actually email" =
    `all_contacts` minus this table. Nobody is deleted from `all_contacts`
    (it's a view over real records) — unsubscribing just adds a row here.

  ## Security
  - `email_unsubscribes`: authenticated-only for read/manage (dashboard).
    Inserts from the public unsubscribe flow go through the
    `unsubscribe-email` edge function using the service-role key, which
    bypasses RLS by design — the same pattern already used elsewhere in this
    app for privileged server-side writes. No direct anon access to this
    table at all.
  - `all_contacts` is a view over tables that already have their own RLS;
    granted to `authenticated` only (it's a dashboard/reporting tool, not
    something the public site ever queries) plus implicitly readable by
    edge functions via the service-role key.
*/

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email text PRIMARY KEY,
  unsubscribed_at timestamptz DEFAULT now()
);
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_email_unsubscribes" ON email_unsubscribes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_email_unsubscribes" ON email_unsubscribes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_delete_email_unsubscribes" ON email_unsubscribes FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE VIEW all_contacts AS
WITH raw AS (
  SELECT lower(trim(email)) AS email, name AS name, 'Donors' AS source, created_at AS seen_at FROM donors WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(donor_email)), donor_name, 'In-Kind Donations', created_at FROM in_kind_donations WHERE donor_email IS NOT NULL AND trim(donor_email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), donor_name, 'Cash Donations', created_at FROM donation_records WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), NULL, 'Donation Pledges', created_at FROM donation_commitments WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), name, 'Contact Messages', created_at FROM contact_submissions WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), full_name, 'Join Requests', created_at FROM join_requests WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), full_name, 'Team Applications', created_at FROM team_applications WHERE email IS NOT NULL AND trim(email) <> ''
  UNION ALL
  SELECT lower(trim(email)), name, 'Support Requests', created_at FROM support_requests WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), full_name, 'Peer Support Signups', created_at FROM peer_support_signups WHERE email IS NOT NULL AND trim(email) <> ''
  UNION ALL
  SELECT lower(trim(email)), name, 'Volunteers', created_at FROM volunteers WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
  UNION ALL
  SELECT lower(trim(email)), name, 'Event Registrations', created_at FROM event_registrations WHERE email IS NOT NULL AND trim(email) <> '' AND deleted_at IS NULL
)
SELECT
  email,
  (array_agg(name ORDER BY seen_at) FILTER (WHERE name IS NOT NULL AND trim(name) <> ''))[1] AS name,
  array_agg(DISTINCT source ORDER BY source) AS sources,
  min(seen_at) AS first_seen_at
FROM raw
GROUP BY email;

GRANT SELECT ON all_contacts TO authenticated;
