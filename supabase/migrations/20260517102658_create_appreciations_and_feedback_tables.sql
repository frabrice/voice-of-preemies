/*
  # Create appreciations and feedback tables

  ## New Tables

  ### appreciations
  - `id` (uuid, primary key)
  - `author_name` (text) - name of the person submitting
  - `author_role` (text) - their role (e.g., "NICU Parent", "Healthcare Worker")
  - `message` (text) - the appreciation message
  - `status` (text) - pending/approved/rejected, defaults to 'pending'
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) - for soft delete

  ### feedback
  - `id` (uuid, primary key)
  - `author_name` (text) - name of submitter
  - `author_email` (text, nullable) - optional email
  - `subject` (text) - feedback subject
  - `message` (text) - feedback content
  - `status` (text) - pending/approved/rejected, defaults to 'pending'
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) - for soft delete

  ## Security
  - RLS enabled on both tables
  - Anonymous users can INSERT (public submissions)
  - Authenticated users (admins) can SELECT, UPDATE, DELETE
  - Pending approval workflow: all public submissions start as 'pending'
*/

CREATE TABLE IF NOT EXISTS appreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE appreciations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit appreciations"
  ON appreciations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view approved appreciations"
  ON appreciations FOR SELECT
  TO anon
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Admins can view all appreciations"
  ON appreciations FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can update appreciations"
  ON appreciations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete appreciations"
  ON appreciations FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT '',
  author_email text DEFAULT NULL,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view approved feedback"
  ON feedback FOR SELECT
  TO anon
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete feedback"
  ON feedback FOR DELETE
  TO authenticated
  USING (true);
