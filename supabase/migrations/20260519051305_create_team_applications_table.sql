/*
  # Create team_applications table

  ## Purpose
  Stores submissions from people who want to join the Voice of Preemies Rwanda team
  via the public /join-our-team form.

  ## New Tables

  ### team_applications
  - `id` (uuid, primary key) — auto-generated
  - `title` (text, required) — honorific: Dr., Prof., Mr., Mrs., Ms., Rev.
  - `full_name` (text, required) — applicant's full name
  - `country` (text, required) — country of residence
  - `phone` (text, required) — phone number including dial code
  - `email` (text, required) — contact email
  - `profile_picture_url` (text) — URL in Supabase Storage after upload
  - `bio` (text) — optional short background / bio (2–3 sentences)
  - `status` (text, default 'pending') — pending / reviewed / accepted / declined
  - `created_at` (timestamptz) — submission timestamp

  ## Security
  - RLS enabled
  - Anonymous and authenticated users can INSERT (public contact form)
  - Only authenticated (admin) users can SELECT, UPDATE, DELETE

  ## Storage
  - A storage bucket 'team-applications' should be created separately for profile pictures
*/

CREATE TABLE IF NOT EXISTS team_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  full_name text NOT NULL,
  country text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL,
  profile_picture_url text DEFAULT '',
  bio text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a team application"
  ON team_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view team applications"
  ON team_applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update team application status"
  ON team_applications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete team applications"
  ON team_applications
  FOR DELETE
  TO authenticated
  USING (true);
