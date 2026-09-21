/*
  # Create training_registrations table

  ## Purpose
  Paid registration for Voice of Preemies training sessions (starting with the
  Mental Health Open Day, 27 September 2026). Registrants pay via MoMo code
  before or after submitting, then tell us the name the payment shows under;
  an admin cross-checks that against the real MoMo transaction history and
  marks the registration paid, which triggers a confirmation email.

  ## New Tables

  ### training_registrations
  - `id` (uuid, primary key)
  - `registration_type` (text) — 'individual' | 'couple'
  - `primary_name` (text) — registrant's name
  - `partner_name` (text, nullable) — second name, only set for 'couple'
  - `phone` (text)
  - `email` (text) — used for the confirmation email; one per registration
    (couples share a single email, per registrant preference)
  - `payer_name` (text) — name the MoMo payment was made under, for the admin
    to match against transaction history
  - `amount` (int) — 20000 for individual, 40000 for couple (computed at
    submission time, not user-editable)
  - `payment_status` (text, default 'pending') — 'pending' | 'confirmed'
  - `confirmed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) — soft delete, project-wide convention

  ## Security
  - RLS enabled. `anon` + `authenticated` can INSERT (the public registration
    form has no login). Only `authenticated` can SELECT/UPDATE — this table
    holds names, phone numbers, and payment information, so unlike the
    published-content tables in this project there is no anon SELECT policy
    at all.
*/

CREATE TABLE IF NOT EXISTS training_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_type text NOT NULL CHECK (registration_type IN ('individual', 'couple')),
  primary_name text NOT NULL,
  partner_name text,
  phone text NOT NULL,
  email text NOT NULL,
  payer_name text NOT NULL,
  amount int NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE training_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_training_registrations" ON training_registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_training_registrations" ON training_registrations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_update_training_registrations" ON training_registrations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
