/*
  # Create In-Kind Donations Table

  ## Summary
  Adds a new table to capture non-cash (in-kind) donation pledges submitted through
  the public donate page. These are separate from the existing `donation_records` table
  which tracks cash transactions.

  ## New Tables
  - `in_kind_donations`
    - `id` (uuid, primary key)
    - `donor_name` (text) — Required
    - `donor_email` (text) — Required
    - `donor_phone` (text) — Required for pickups, optional otherwise
    - `items_description` (text) — What items are being donated
    - `items_value_estimate` (numeric) — Optional estimated USD value
    - `logistics_mode` (text) — 'dropoff' or 'pickup'
    - `dropoff_location` (text) — Where donor will drop items
    - `pickup_address` (text) — Address for us to collect from
    - `pickup_availability` (text) — Best times for pickup
    - `notes` (text) — Special instructions (fragile, etc.)
    - `anonymous` (boolean) — Whether donor wants to remain anonymous
    - `status` (text) — pending / confirmed / received / fulfilled
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
    - `deleted_at` (timestamp) — soft delete

  ## Security
  - RLS enabled
  - Authenticated users (admins) can read/update/delete all records
  - Public users (anon) can insert new records (submit donations)
*/

CREATE TABLE IF NOT EXISTS in_kind_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name text NOT NULL DEFAULT '',
  donor_email text NOT NULL DEFAULT '',
  donor_phone text NOT NULL DEFAULT '',
  items_description text NOT NULL DEFAULT '',
  items_value_estimate numeric DEFAULT NULL,
  logistics_mode text NOT NULL DEFAULT 'dropoff' CHECK (logistics_mode IN ('dropoff', 'pickup')),
  dropoff_location text DEFAULT 'King Faisal Hospital, KG 544 St, Kigali',
  pickup_address text DEFAULT '',
  pickup_availability text DEFAULT '',
  notes text DEFAULT '',
  anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'received', 'fulfilled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE in_kind_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read in_kind_donations"
  ON in_kind_donations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update in_kind_donations"
  ON in_kind_donations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete in_kind_donations"
  ON in_kind_donations FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can submit in_kind_donations"
  ON in_kind_donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS in_kind_donations_status_idx ON in_kind_donations (status);
CREATE INDEX IF NOT EXISTS in_kind_donations_created_at_idx ON in_kind_donations (created_at DESC);
CREATE INDEX IF NOT EXISTS in_kind_donations_deleted_at_idx ON in_kind_donations (deleted_at);
