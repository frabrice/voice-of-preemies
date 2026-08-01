/*
  # Create peer_support_signups table

  ## Purpose
  Stores sign-up submissions from users who want to join the Peer Support Network
  through the "Join Peer Support Network" button in the website header.

  ## New Tables

  ### peer_support_signups
  - `id` (uuid, primary key) — auto-generated
  - `full_name` (text, required) — applicant's full name
  - `email` (text, required) — contact email address
  - `phone` (text, optional) — contact phone number
  - `baby_birth_date` (date, optional) — approximate birth date of the premature baby
  - `nicu_hospital` (text, optional) — hospital where the baby received NICU care
  - `how_heard` (text, optional) — how the applicant heard about the network
  - `message` (text, optional) — brief message or reason for joining
  - `created_at` (timestamptz) — submission timestamp

  ## Security
  - RLS enabled — table is locked down by default
  - INSERT policy: anyone (including anonymous/unauthenticated users) can submit a sign-up — this is a public contact form
  - SELECT policy: only authenticated (admin) users can read submissions
  - No update or delete policies — submissions are immutable from the public side
*/

CREATE TABLE IF NOT EXISTS peer_support_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  baby_birth_date date,
  nicu_hospital text DEFAULT '',
  how_heard text DEFAULT '',
  message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE peer_support_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a peer support sign-up"
  ON peer_support_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view peer support sign-ups"
  ON peer_support_signups
  FOR SELECT
  TO authenticated
  USING (true);
