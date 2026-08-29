/*
  # Create careers table + site-wide Careers page toggle

  ## Purpose
  Schema-driven job postings, so adding a future opening is pure data entry.
  Each posting auto-expires after a set number of days (computed at creation/
  edit time into a stored `deadline` date) and moves to the dashboard's "Past"
  view once expired — no cron job needed, this is just a read-time computation
  against `deadline`.

  ## New Tables

  ### careers
  - `id` (uuid, primary key)
  - `slug` (text, unique) — public URL at /careers/:slug
  - `title` (text) — job title
  - `summary` (text) — short teaser shown on the /careers index
  - `description` (text) — full posting body (responsibilities, qualifications, etc.)
  - `apply_email` (text, default 'voiceofpreemies@gmail.com') — editable per posting
  - `posted_date` (date, default current_date)
  - `duration_days` (int) — what the admin enters
  - `deadline` (date) — computed as posted_date + duration_days at save time
  - `published` (boolean, default true) — manual override, independent of deadline
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) — soft delete, project-wide convention

  ## Changes to existing tables
  - `site_settings.careers_page_enabled` (boolean, default true) — a single
    master switch. When off, the ENTIRE /careers section (index + every
    individual posting link) becomes unavailable and the nav link is hidden —
    this is a hard gate, not just a nav-visibility toggle.

  ## Security
  - RLS enabled on `careers`. `anon` + `authenticated` can SELECT published,
    non-deleted rows (deadline is NOT filtered at this layer — an expired
    posting still needs to be readable so its page can show a friendly
    "no longer accepting applications" message instead of breaking a shared
    link outright; the master `careers_page_enabled` switch is what fully
    gates the section, enforced in the frontend). Only `authenticated` can
    INSERT/UPDATE.
*/

CREATE TABLE IF NOT EXISTS careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  apply_email text NOT NULL DEFAULT 'voiceofpreemies@gmail.com',
  posted_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_days int NOT NULL DEFAULT 30,
  deadline date NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE careers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_published_careers" ON careers
  FOR SELECT TO anon
  USING (published = true AND deleted_at IS NULL);

CREATE POLICY "authenticated_select_all_careers" ON careers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_careers" ON careers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_careers" ON careers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS careers_page_enabled boolean NOT NULL DEFAULT true;
