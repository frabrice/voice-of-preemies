/*
  # Create donation_commitments table

  Stores future donation pledges captured on the /donations-of-today page.
  People leave their phone (required), optional email, optional notes,
  and the event label they signed up under.
*/

CREATE TABLE IF NOT EXISTS donation_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_label text NOT NULL DEFAULT '',
  commitment_date date NOT NULL,
  phone text NOT NULL,
  email text DEFAULT NULL,
  notes text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'fulfilled')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE donation_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_donation_commitments" ON donation_commitments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_donation_commitments" ON donation_commitments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_donation_commitments" ON donation_commitments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_donation_commitments" ON donation_commitments
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS donation_commitments_created_at_idx ON donation_commitments (created_at DESC);
CREATE INDEX IF NOT EXISTS donation_commitments_deleted_at_idx ON donation_commitments (deleted_at);
