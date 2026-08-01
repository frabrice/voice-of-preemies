/*
  # Create support_requests table

  1. New Tables
    - `support_requests`
      - `id` (uuid, primary key)
      - `role` (text) — parent, healthcare, donor, supporter
      - `support_type` (text) — the Step 2 contextual answer
      - `name` (text, required)
      - `phone` (text, required)
      - `email` (text, nullable)
      - `note` (text, nullable)
      - `status` (text, default 'unread')
      - `created_at` (timestamptz)
      - `deleted_at` (timestamptz, nullable)

  2. Security
    - Enable RLS
    - Anonymous users can INSERT (submit a support request from the public site)
    - Authenticated users can SELECT, UPDATE, DELETE (admin dashboard access)
*/

CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT '',
  support_type text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text DEFAULT NULL,
  note text DEFAULT NULL,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a support request"
  ON support_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view support requests"
  ON support_requests FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can update support requests"
  ON support_requests FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can soft-delete support requests"
  ON support_requests FOR DELETE
  TO authenticated
  USING (true);
