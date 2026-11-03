/*
  # Nurse training registrations

  Free registration for nurses attending Voice of Preemies trainings, starting with
  "Home & Hospital Newborn Care Training" (Sunday 8 November 2026).

  Nobody can write to this table directly. The public form posts to the
  `create-nurse-registration` edge function, which validates the input, blocks
  duplicates and sends the emails using the service role. Only signed-in
  dashboard users can read or manage the rows.
*/

CREATE TABLE IF NOT EXISTS nurse_training_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_key text NOT NULL,
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
  phone text NOT NULL,
  email text NOT NULL,
  years_experience smallint NOT NULL CHECK (years_experience BETWEEN 0 AND 60),
  workplace text NOT NULL CHECK (length(btrim(workplace)) > 0),
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- One registration per email per training (case-insensitive), ignoring deleted ones.
CREATE UNIQUE INDEX IF NOT EXISTS nurse_training_one_per_email
  ON nurse_training_registrations (training_key, lower(email)) WHERE deleted_at IS NULL;

ALTER TABLE nurse_training_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nurse_training_registrations FROM anon, public;
GRANT SELECT, UPDATE ON nurse_training_registrations TO authenticated;
GRANT ALL ON nurse_training_registrations TO service_role;

CREATE POLICY "authenticated_select_nurse_training" ON nurse_training_registrations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_nurse_training" ON nurse_training_registrations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
