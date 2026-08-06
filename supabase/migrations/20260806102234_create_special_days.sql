/*
  # Create special_days table

  ## Purpose
  A small, admin-managed list of upcoming awareness days / observances (e.g.
  World Breastfeeding Week, World Prematurity Day, Car Free Day) shown in the
  "Upcoming" sidebar on the public Publications page. Deliberately separate
  from `news_articles`/`events` — this is a running calendar of dates to
  remember, not article content.

  ## New Tables

  ### special_days
  - `id` (uuid, primary key)
  - `title` (text, required) — e.g. "World Prematurity Day"
  - `date` (date, required) — the occasion's date
  - `note` (text, default '') — optional short context line
  - `link_url` (text, default '') — optional link (e.g. to a related News article)
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) — soft delete, project-wide convention

  ## Security
  - RLS enabled. `anon` + `authenticated` can SELECT (not sensitive data, needed
    for the public sidebar to render without a login) restricted to non-deleted
    rows. Only `authenticated` can INSERT/UPDATE (the admin list).
*/

CREATE TABLE IF NOT EXISTS special_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  note text DEFAULT '',
  link_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_special_days" ON special_days
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "authenticated_insert_special_days" ON special_days
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_special_days" ON special_days
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
