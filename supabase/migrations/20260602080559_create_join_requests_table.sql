/*
  # Create join_requests table

  Unified community signups table for all roles joining Voice of Preemies.

  1. New Tables
    - `join_requests`
      - `id` (uuid, primary key)
      - `role` (text, required) - Parent/Family, Healthcare Professional, Advisor/Expert, Volunteer, Other Supporter
      - `full_name` (text, required)
      - `email` (text, required)
      - `phone` (text, required)
      - `organization` (text, nullable) - for professionals/advisors
      - `expertise` (text, nullable) - area of expertise
      - `motivation` (text, nullable) - why they want to join
      - `how_heard` (text, nullable) - how they found us
      - `status` (text, default 'pending') - pending/contacted/approved/declined
      - `created_at` (timestamptz)
      - `deleted_at` (timestamptz, nullable) - soft delete

  2. Security
    - Enable RLS on `join_requests` table
    - Public insert policy for anonymous signups
    - Authenticated select/update/delete policies for admin dashboard
*/

CREATE TABLE IF NOT EXISTS join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text,
  expertise text,
  motivation text,
  how_heard text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a join request (public form)
CREATE POLICY "Anyone can submit a join request"
  ON join_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins can view all join requests
CREATE POLICY "Authenticated users can view join requests"
  ON join_requests
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Authenticated admins can update join requests
CREATE POLICY "Authenticated users can update join requests"
  ON join_requests
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- Authenticated admins can soft-delete join requests
CREATE POLICY "Authenticated users can delete join requests"
  ON join_requests
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);
