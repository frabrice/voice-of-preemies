-- ============================================================
-- Voice of Preemies — full schema bootstrap for the NEW
-- Supabase project. Generated 2026-08-01 from the
-- app's migration files. Paste this whole file into the new
-- project's SQL Editor and click Run.
-- ============================================================

-- ── 1. Bootstrap: every table missing from migration history ──
/*
  # Bootstrap missing schema (fresh Voice of Preemies-owned Supabase project)

  ## Why this exists
  The original 25 migration files in this repo only ever covered ~8 tables
  (in_kind_donations, appreciations, feedback, support_requests,
  peer_support_signups, team_applications, join_requests, donation_commitments).
  Every other table the app depends on was created directly against the old,
  externally-owned Supabase project and never captured as a migration. This
  migration reconstructs every one of those missing tables from a full read of
  the application code (every `supabase.from(...)` call and every field the
  dashboard forms read/write), so a brand-new Supabase project ends up with a
  complete, working schema. No data is being carried over from the old project
  (no access to it) — this is a fresh start; tables are created empty and the
  team will repopulate content through the dashboard.

  ## Tables created
  Content (public-readable when published/active):
    programs, news_articles, stories, resources, events, team_members,
    partners, board_members, site_stats
  Admin-only day-to-day:
    event_registrations, documents, document_categories, donors,
    donation_records, contact_submissions, volunteers
  Finance (admin-only):
    finance_categories, finance_transactions, projects
  Restricted medical/beneficiary data (super_admin only, both RLS and app UI):
    preemies, parents, nurses, health_workers
  System / access control:
    user_roles, role_permissions, user_activity_log

  ## Security approach
  - RLS enabled on every table, no exceptions.
  - Public content tables: anon can SELECT only rows that are published/active
    (and not soft-deleted); all writes require `authenticated`.
  - Tables with no legitimate public-facing use (donors, finance, projects,
    documents by default, event_registrations, volunteers, contact_submissions,
    donation_records) are `authenticated`-only for every operation — no anon
    grants at all. This intentionally avoids repeating the mistake found in the
    old project, where `donors` was made publicly world-readable for a "donor
    wall" feature that was never built.
  - preemies/parents/nurses/health_workers hold real beneficiary and medical
    data. RLS restricts every operation to users whose `user_roles.role` is
    `super_admin`, matching the app's own UI-level restriction — so this is
    enforced at the database level too, not just hidden in the dashboard.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper: is the current authenticated user a super_admin?
-- (user_roles is created below; this function is created after it.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- System / access control tables (created first — other tables reference
-- the is_super_admin() helper which depends on user_roles existing)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'content_manager', 'finance_manager', 'database_manager', 'support_agent', 'event_coordinator')),
  display_name text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_email_idx ON user_roles (email);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

CREATE POLICY "authenticated_select_user_roles" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "super_admin_insert_user_roles" ON user_roles FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_update_user_roles" ON user_roles FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_delete_user_roles" ON user_roles FOR DELETE TO authenticated USING (is_super_admin());

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  page text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (role, page)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "super_admin_insert_role_permissions" ON role_permissions FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_update_role_permissions" ON role_permissions FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_delete_role_permissions" ON role_permissions FOR DELETE TO authenticated USING (is_super_admin());

CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_activity_log" ON user_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_activity_log" ON user_activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "super_admin_delete_activity_log" ON user_activity_log FOR DELETE TO authenticated USING (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Public content tables — anon SELECT limited to published/active rows
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'Core Program',
  tagline text DEFAULT '',
  description text DEFAULT '',
  long_description text DEFAULT '',
  image_url text DEFAULT '',
  icon_name text DEFAULT 'Heart',
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  who_for text DEFAULT '',
  how_to_access text DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_published_programs" ON programs FOR SELECT TO anon, authenticated USING (published = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_programs" ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_programs" ON programs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_programs" ON programs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_programs" ON programs FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  excerpt text DEFAULT '',
  content text DEFAULT '',
  tag text NOT NULL DEFAULT 'News',
  date date NOT NULL DEFAULT CURRENT_DATE,
  image_url text DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_published_news" ON news_articles FOR SELECT TO anon, authenticated USING (published = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_news" ON news_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_news" ON news_articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_news" ON news_articles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_news" ON news_articles FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  baby_info text DEFAULT '',
  tag text NOT NULL DEFAULT 'Parent Story',
  location text DEFAULT 'Kigali',
  year integer NOT NULL DEFAULT EXTRACT(year FROM now()),
  excerpt text DEFAULT '',
  full_story text DEFAULT '',
  image_url text DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_published_stories" ON stories FOR SELECT TO anon, authenticated USING (published = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_stories" ON stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_stories" ON stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_stories" ON stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_stories" ON stories FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Guides & Handbooks',
  type text NOT NULL DEFAULT 'Article',
  url text DEFAULT '',
  file_url text DEFAULT '',
  file_size text DEFAULT '',
  duration text DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_published_resources" ON resources FOR SELECT TO anon, authenticated USING (published = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_resources" ON resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_resources" ON resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_resources" ON resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_resources" ON resources FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  location text DEFAULT '',
  type text NOT NULL DEFAULT 'workshop',
  image_url text DEFAULT '',
  registration_url text DEFAULT '',
  capacity integer DEFAULT 0,
  organizer text DEFAULT '',
  budget_estimate numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_published_events" ON events FOR SELECT TO anon, authenticated USING (published = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_events" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_events" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_events" ON events FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  role text DEFAULT '',
  bio text DEFAULT '',
  image_url text DEFAULT '',
  email text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_active_team_members" ON team_members FOR SELECT TO anon, authenticated USING (active = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_team_members" ON team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_team_members" ON team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_team_members" ON team_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_team_members" ON team_members FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  logo_url text DEFAULT '',
  website_url text DEFAULT '',
  category text NOT NULL DEFAULT 'NGO',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_active_partners" ON partners FOR SELECT TO anon, authenticated USING (active = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_partners" ON partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_partners" ON partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_partners" ON partners FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_partners" ON partners FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  position text DEFAULT 'member',
  bio text DEFAULT '',
  photo_url text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  term_start date,
  term_end date,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_active_board_members" ON board_members FOR SELECT TO anon, authenticated USING (active = true AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_board_members" ON board_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_board_members" ON board_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_board_members" ON board_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_board_members" ON board_members FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS site_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT '',
  icon text DEFAULT 'Heart',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_site_stats" ON site_stats FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "authenticated_write_site_stats" ON site_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_site_stats" ON site_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_site_stats" ON site_stats FOR DELETE TO authenticated USING (true);

INSERT INTO site_stats (label, value, icon, sort_order) VALUES
  ('Families Supported', '0', 'Heart', 1),
  ('Hospitals Reached', '0', 'Building2', 2),
  ('Support Sessions', '0', 'Headphones', 3),
  ('Funds Raised', '$0', 'Globe', 4);

-- ─────────────────────────────────────────────────────────────────────────
-- Admin-only day-to-day tables — no anon access at all
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_event_registrations" ON event_registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  color text DEFAULT '#0A6070',
  icon text DEFAULT 'FileText',
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_document_categories" ON document_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  file_url text DEFAULT '',
  file_type text DEFAULT 'other',
  file_size text DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  access_level text NOT NULL DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_public_documents" ON documents FOR SELECT TO anon, authenticated USING (access_level = 'public' AND deleted_at IS NULL);
CREATE POLICY "authenticated_select_all_documents" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_documents" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_documents" ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_documents" ON documents FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'organization')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_donors" ON donors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS donation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  method text DEFAULT 'Bank Transfer',
  reference text DEFAULT '',
  message text DEFAULT '',
  anonymous boolean NOT NULL DEFAULT false,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE donation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_donation_records" ON donation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  subject text DEFAULT '',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'active', 'replied', 'completed')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_contact_submissions" ON contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "authenticated_select_contact_submissions" ON contact_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_contact_submissions" ON contact_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_contact_submissions" ON contact_submissions FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  skills text DEFAULT '',
  availability text DEFAULT '',
  motivation text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_volunteers" ON volunteers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "authenticated_select_volunteers" ON volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_volunteers" ON volunteers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_volunteers" ON volunteers FOR DELETE TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Finance (admin-only, no anon access — a past mistake we're not repeating)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  color text DEFAULT '#0A6070',
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_finance_categories" ON finance_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
  category_name text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text DEFAULT '',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  donor_id uuid REFERENCES donors(id) ON DELETE SET NULL,
  vendor text DEFAULT '',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'reconciled')),
  reference text DEFAULT '',
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_finance_transactions" ON finance_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Restricted beneficiary / medical data — super_admin only, enforced in RLS
-- (the app's UI already hides these behind an adminRole check; this makes
-- that restriction real at the database layer too)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  district text DEFAULT '',
  relationship text NOT NULL DEFAULT 'mother' CHECK (relationship IN ('mother', 'father', 'guardian')),
  preferred_language text NOT NULL DEFAULT 'en',
  number_of_preemies integer NOT NULL DEFAULT 1,
  support_enrolled boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_parents" ON parents FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE IF NOT EXISTS nurses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  hospital text DEFAULT '',
  department text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  certification text DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_nurses" ON nurses FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE IF NOT EXISTS health_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  role text DEFAULT '',
  organization text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  district text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE health_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_health_workers" ON health_workers FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE IF NOT EXISTS preemies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  date_of_birth date,
  gestational_age_weeks integer,
  birth_weight_grams integer,
  sex text CHECK (sex IN ('M', 'F')),
  nicu_hospital text DEFAULT '',
  admission_date date,
  discharge_date date,
  status text NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged', 'deceased', 'transferred')),
  parent_id uuid REFERENCES parents(id) ON DELETE SET NULL,
  assigned_nurse_id uuid REFERENCES nurses(id) ON DELETE SET NULL,
  medical_notes text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
ALTER TABLE preemies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_preemies" ON preemies FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Indexes for the common query patterns (deleted_at filters, sort/order)
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS programs_deleted_at_idx ON programs (deleted_at);
CREATE INDEX IF NOT EXISTS news_articles_deleted_at_idx ON news_articles (deleted_at);
CREATE INDEX IF NOT EXISTS stories_deleted_at_idx ON stories (deleted_at);
CREATE INDEX IF NOT EXISTS resources_deleted_at_idx ON resources (deleted_at);
CREATE INDEX IF NOT EXISTS events_deleted_at_idx ON events (deleted_at);
CREATE INDEX IF NOT EXISTS team_members_deleted_at_idx ON team_members (deleted_at);
CREATE INDEX IF NOT EXISTS partners_deleted_at_idx ON partners (deleted_at);
CREATE INDEX IF NOT EXISTS board_members_deleted_at_idx ON board_members (deleted_at);
CREATE INDEX IF NOT EXISTS documents_deleted_at_idx ON documents (deleted_at);
CREATE INDEX IF NOT EXISTS donors_deleted_at_idx ON donors (deleted_at);
CREATE INDEX IF NOT EXISTS donation_records_deleted_at_idx ON donation_records (deleted_at);
CREATE INDEX IF NOT EXISTS contact_submissions_deleted_at_idx ON contact_submissions (deleted_at);
CREATE INDEX IF NOT EXISTS volunteers_deleted_at_idx ON volunteers (deleted_at);
CREATE INDEX IF NOT EXISTS finance_transactions_deleted_at_idx ON finance_transactions (deleted_at);
CREATE INDEX IF NOT EXISTS finance_transactions_date_idx ON finance_transactions (date DESC);
CREATE INDEX IF NOT EXISTS preemies_deleted_at_idx ON preemies (deleted_at);
CREATE INDEX IF NOT EXISTS parents_deleted_at_idx ON parents (deleted_at);
CREATE INDEX IF NOT EXISTS nurses_deleted_at_idx ON nurses (deleted_at);
CREATE INDEX IF NOT EXISTS health_workers_deleted_at_idx ON health_workers (deleted_at);

-- ─────────────────────────────────────────────────────────────────────────
-- Table-level GRANTs. The old project once shipped a bug where a table had
-- correct RLS policies but no underlying GRANT, so it silently returned
-- empty results in production (see the now-obsolete
-- grant_programs_table_permissions migration). RLS still does the real
-- row-level filtering on top of this — granting the verb here does not
-- bypass RLS, it just makes sure the verb is possible at all.
-- ─────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- ── 20260517085152_create_in_kind_donations_table.sql ──
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

-- ── 20260517102658_create_appreciations_and_feedback_tables.sql ──
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

-- ── 20260517112324_create_support_requests_table.sql ──
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

-- ── 20260518152829_create_peer_support_signups_table.sql ──
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

-- ── 20260519051305_create_team_applications_table.sql ──
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

-- ── 20260519051332_create_team_applications_storage_policies.sql ──
/*
  # Create storage bucket and policies for team application photos

  Creates the 'team-applications' storage bucket for profile picture uploads
  and configures RLS policies to allow public uploads and reads.
*/

-- Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-applications',
  'team-applications',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anyone can upload team application photos'
  ) THEN
    CREATE POLICY "Anyone can upload team application photos"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'team-applications');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public can read team application photos'
  ) THEN
    CREATE POLICY "Public can read team application photos"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'team-applications');
  END IF;
END $$;

-- ── 20260528093939_update_peer_support_signups_schema.sql ──
/*
  # Update peer_support_signups table schema

  1. Modified Columns
    - `email` - changed from NOT NULL to nullable (now optional)
    - `phone` - changed from nullable to NOT NULL (now required)
  2. New Columns
    - `relationship` (text, NOT NULL) - stores the user's relation to the preemie (Mother, Father, Brother, Sister, Grandparent, Other)
  3. Notes
    - Existing rows with NULL phone will be set to empty string before applying NOT NULL constraint
    - Existing rows will get 'Other' as default relationship value
*/

-- Backfill existing NULL phone values before making NOT NULL
UPDATE peer_support_signups SET phone = '' WHERE phone IS NULL;

-- Make email nullable
ALTER TABLE peer_support_signups ALTER COLUMN email DROP NOT NULL;

-- Make phone NOT NULL
ALTER TABLE peer_support_signups ALTER COLUMN phone SET NOT NULL;

-- Add relationship column with default for existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'peer_support_signups' AND column_name = 'relationship'
  ) THEN
    ALTER TABLE peer_support_signups ADD COLUMN relationship text NOT NULL DEFAULT 'Other';
  END IF;
END $$;

-- ── 20260528100816_add_program_detail_columns.sql ──
/*
  # Add detail columns to programs table

  1. New Columns
    - `slug` (text, unique, not null) - URL-friendly identifier for routing
    - `tagline` (text, nullable) - Evocative subtitle displayed under the title
    - `long_description` (text, nullable) - Extended content for the detail page
    - `icon_name` (text, nullable) - Lucide icon name for visual identity

  2. Notes
    - Existing rows get a slug generated from their id (temporary, editable later)
    - Unique constraint on slug ensures no duplicates
*/

-- Add columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'slug'
  ) THEN
    ALTER TABLE programs ADD COLUMN slug text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE programs ADD COLUMN tagline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'long_description'
  ) THEN
    ALTER TABLE programs ADD COLUMN long_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE programs ADD COLUMN icon_name text;
  END IF;
END $$;

-- Backfill existing rows with a slug from their id
UPDATE programs SET slug = id::text WHERE slug IS NULL;

-- Now make slug NOT NULL and UNIQUE
ALTER TABLE programs ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'programs_slug_key'
  ) THEN
    ALTER TABLE programs ADD CONSTRAINT programs_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ── 20260528101143_seed_ten_programs.sql ──
/*
  # Seed 10 Programs for Voice of Preemies

  1. Programs Seeded
    - Parent Emotional Support (Core Program)
    - NICU Family Support Program (Hospital Program)
    - Kangaroo Mother Care & Home Transition (Core Program)
    - Breastfeeding & Nutrition Support (Core Program)
    - Father & Family Inclusion Program (Specialized Support)
    - Parent Support Communities (Community)
    - Financial & Practical Assistance (Community)
    - Education & Awareness (Education)
    - Bereavement & Loss Support (Specialized Support)
    - Professional & Hospital Partnerships (Advocacy)

  2. Each program includes
    - Full services array
    - Target audience and access info
    - Curated Pexels image URL
    - Unique slug for URL routing
    - Evocative tagline
    - Extended long description for detail pages
*/

INSERT INTO programs (slug, title, tag, tagline, description, long_description, image_url, icon_name, services, who_for, how_to_access, published, sort_order)
VALUES
(
  'parent-emotional-support',
  'Parent Emotional Support',
  'Core Program',
  'Because parents need care too.',
  'Supporting parents emotionally during NICU hospitalization and the recovery journey home. In Rwanda and many African communities, mental health support is often missing after childbirth trauma — this program fills that gap.',
  'The Parent Emotional Support program is the heart of Voice of Preemies. We recognize that when a baby arrives prematurely, parents experience a unique form of trauma — anxiety, guilt, fear, and isolation that can last long after discharge. In many African communities, mental health support after childbirth trauma remains scarce and stigmatized. Our program breaks that silence by providing safe, culturally sensitive spaces where parents can process their emotions, connect with trained counselors, and find strength alongside others who truly understand their journey. From one-on-one sessions to group listening circles, we walk beside parents every step of the way.',
  'https://images.pexels.com/photos/13984519/pexels-photo-13984519.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Heart',
  '["One-on-one emotional support sessions", "Parent listening sessions and group circles", "Stress and trauma counseling", "Support for anxiety after premature birth", "Mental wellness check-ins", "Peer mentorship from experienced parents"]',
  'All parents and caregivers of premature babies — mothers, fathers, and extended family members experiencing emotional distress.',
  'Contact us directly, ask your NICU nurse, or join one of our weekly group sessions in Kigali.',
  true,
  1
),
(
  'nicu-family-support',
  'NICU Family Support Program',
  'Hospital Program',
  'Navigating the NICU, together.',
  'Helping families navigate the overwhelming world of neonatal intensive care with guidance, advocacy, and compassionate support at the bedside.',
  'The NICU is one of the most overwhelming environments a parent can face. Machines beeping, medical terminology, the sight of your tiny baby connected to tubes — it can feel paralyzing. Our NICU Family Support Program places trained peer mentors and family advocates directly within partner hospital NICUs across Rwanda. We bridge the gap between medical teams and families, explaining procedures in plain language, helping parents advocate for their baby, coordinating family visits, and providing the emotional anchor families desperately need during hospitalization. No parent should feel like a visitor in their own baby''s care.',
  'https://images.pexels.com/photos/12365687/pexels-photo-12365687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Building2',
  '["NICU orientation and navigation guidance", "Explaining medical procedures in simple language", "Parent advocacy assistance with medical teams", "Family visiting coordination and support", "Hospital-family communication facilitation", "Emotional support during hospitalization"]',
  'Parents and families with babies currently admitted in partner NICU facilities.',
  'Ask your NICU nurse to connect you with our in-hospital support team, or contact us directly.',
  true,
  2
),
(
  'kangaroo-mother-care',
  'Kangaroo Mother Care & Home Transition',
  'Core Program',
  'From hospital care to home confidence.',
  'Kangaroo Mother Care is one of the most powerful interventions for premature babies in Africa. We educate families and support the critical transition from hospital to home.',
  'Kangaroo Mother Care (KMC) — continuous skin-to-skin contact between parent and baby — is one of the most evidence-based, life-saving interventions for premature infants, especially in resource-limited settings. Our program provides comprehensive KMC education to parents while their baby is still in the NICU, then extends that support through the critical discharge transition. We guide families on safe home care practices, feeding schedules, hygiene and infection prevention, temperature regulation, and danger signs to watch for. The journey from hospital to home can feel terrifying — our team ensures no family makes it alone.',
  'https://images.pexels.com/photos/19782322/pexels-photo-19782322.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Baby',
  '["Kangaroo Mother Care education and coaching", "Safe home transition preparation", "Premature baby home-care guidance", "Feeding schedule support and monitoring", "Hygiene and infection prevention education", "Post-discharge follow-up support"]',
  'Parents preparing to bring their premature baby home from the NICU, and families in the first months after discharge.',
  'Enrolled automatically for families in our partner NICUs. Community families can contact us for home support.',
  true,
  3
),
(
  'breastfeeding-nutrition-support',
  'Breastfeeding & Nutrition Support',
  'Core Program',
  'Nourishing the tiniest fighters.',
  'Specialized lactation and nutrition support for mothers of premature babies — from milk expression in the NICU to sustainable feeding at home.',
  'Feeding a premature baby presents unique challenges that many mothers are unprepared for. Babies may be too small or weak to latch, milk supply may be delayed, and the stress of the NICU can further complicate lactation. Our Breastfeeding and Nutrition program provides hands-on lactation support from trained counselors who understand the specific needs of preterm infants. We teach milk expression techniques, help mothers establish and maintain supply, provide guidance on fortification and supplementation when needed, and support the transition to direct breastfeeding. We also address maternal nutrition — because a well-nourished mother is the foundation of a well-nourished baby.',
  'https://images.pexels.com/photos/7943124/pexels-photo-7943124.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Coffee',
  '["Breastfeeding premature babies guidance", "Lactation counselor support", "Milk expression education and techniques", "Nutrition guidance for preterm infants", "Mother nutrition education and support", "Transition to direct breastfeeding coaching"]',
  'Mothers of premature babies at any stage — from NICU admission through the first year at home.',
  'Available at all partner NICU sites. Community mothers can request support through our contact form.',
  true,
  4
),
(
  'father-family-inclusion',
  'Father & Family Inclusion Program',
  'Specialized Support',
  'Prematurity affects the whole family.',
  'Fathers, siblings, and extended family members are often overlooked in neonatal care. This program ensures the whole family is included, informed, and supported.',
  'When a baby arrives early, the focus naturally falls on mother and baby — but fathers, siblings, and grandparents are profoundly affected too. Many African fathers report feeling helpless, excluded from care decisions, and unsure how to support their partner. Siblings may feel confused or abandoned. Extended family may spread misinformation or add pressure. Our Father and Family Inclusion Program specifically addresses these overlooked needs. We provide dedicated father support groups, sibling preparation sessions, extended family education, and whole-family counseling. Because healing happens faster when the entire family system is supported.',
  'https://images.pexels.com/photos/6624358/pexels-photo-6624358.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Users',
  '["Father emotional support and peer groups", "Family counseling sessions", "Sibling preparation and inclusion activities", "Extended family education workshops", "Building home support systems", "Couple communication support"]',
  'Fathers, siblings, grandparents, and extended family members of premature babies.',
  'Fathers can join our monthly men''s group directly. Family sessions available by request through our support form.',
  true,
  5
),
(
  'parent-support-communities',
  'Parent Support Communities',
  'Community',
  'You are never alone in this journey.',
  'Building lasting connections between families who share the premature birth experience — through gatherings, online groups, and storytelling events.',
  'The loneliness of having a premature baby can be overwhelming. Friends and family often don''t understand. Our Parent Support Communities create spaces — both physical and virtual — where families connect with others who truly ''get it.'' From monthly parent gatherings in Kigali to WhatsApp support groups that are active around the clock, from hospital support circles to annual storytelling events where parents share their journeys publicly — we build community that lasts far beyond the NICU. These connections become lifelines, friendships, and sources of hope for newly affected families.',
  'https://images.pexels.com/photos/18824545/pexels-photo-18824545.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Globe',
  '["Monthly parent gatherings in Kigali", "Online support groups and forums", "WhatsApp support communities (24/7)", "Hospital-based support circles", "Parent storytelling and sharing events", "Annual Voice of Preemies Family Day"]',
  'Any parent or family member affected by premature birth — current and past NICU families welcome.',
  'Join our WhatsApp community instantly, or attend our next monthly gathering. No registration needed for open events.',
  true,
  6
),
(
  'financial-practical-assistance',
  'Financial & Practical Assistance',
  'Community',
  'Removing barriers to care.',
  'Prematurity places enormous financial strain on families. We provide practical assistance to ensure no baby''s care is compromised by economic hardship.',
  'In Rwanda and across Africa, the financial burden of a premature birth can be catastrophic. Extended hospital stays, specialized formula, transport costs, lost income — families face impossible choices between care and survival. Our Financial and Practical Assistance program addresses these urgent needs directly. We provide emergency transport to hospitals, essential care packages (diapers, feeding supplies, clothing for tiny babies), accommodation partnerships for families who travel far for NICU care, and referral assistance for financial aid programs. We believe that no family should have to choose between their baby''s survival and their own.',
  'https://images.pexels.com/photos/18788957/pexels-photo-18788957.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'HandHeart',
  '["Emergency transport assistance to hospitals", "Hospital essentials and care packages", "Premature baby starter kits", "Diapers and feeding supplies support", "Accommodation partnerships near hospitals", "Financial aid referral assistance"]',
  'Families facing financial hardship due to premature birth — assessed on need, not means.',
  'Speak with our in-hospital team or submit a request through our support form. Emergency cases prioritized.',
  true,
  7
),
(
  'education-awareness',
  'Education & Awareness',
  'Education',
  'Knowledge is the first step to better outcomes.',
  'Raising awareness about prematurity through campaigns, educational resources, hospital workshops, and community outreach across Rwanda.',
  'Many premature births and their complications could be reduced with better awareness — of warning signs during pregnancy, of the importance of antenatal care, of what to expect in the NICU, and of how to care for a preterm baby at home. Our Education and Awareness program creates and distributes culturally appropriate educational materials, runs community workshops, conducts hospital awareness sessions, and leads national campaigns including World Prematurity Day. We produce parent guides, video resources, and training materials in Kinyarwanda, French, and English — ensuring that life-saving information reaches every family that needs it.',
  'https://images.pexels.com/photos/16629768/pexels-photo-16629768.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'BookOpen',
  '["Prematurity awareness campaigns", "Parent educational resources and guides", "Hospital workshops for families", "Community education and outreach", "Early warning education during pregnancy", "World Prematurity Day annual campaign"]',
  'Expecting parents, community members, community health workers, and the general public.',
  'Resources freely available on our website. Workshop schedules posted monthly. Community outreach by invitation.',
  true,
  8
),
(
  'bereavement-loss-support',
  'Bereavement & Loss Support',
  'Specialized Support',
  'Your grief is valid. Your baby mattered.',
  'Compassionate, culturally sensitive support for families who have experienced the loss of a premature baby — because grief deserves space and care.',
  'Losing a baby is one of the most devastating experiences a family can endure. In many African cultures, neonatal loss is surrounded by silence — families are expected to ''move on'' quickly, and the depth of parental grief is often minimized or misunderstood. Our Bereavement program creates a safe, compassionate space for families to grieve, remember, and heal. We offer dedicated grief counseling, bereaved parent peer groups where families connect with others who understand their loss, memory-making support, and culturally and religiously sensitive mourning guidance. We believe every baby''s life — no matter how brief — deserves to be honored.',
  'https://images.pexels.com/photos/8865097/pexels-photo-8865097.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Heart',
  '["Emotional support after neonatal loss", "Grief counseling with trained professionals", "Bereaved parent peer support groups", "Family healing and remembrance support", "Memorial and memory-making initiatives", "Long-term grief follow-up"]',
  'Families who have experienced the loss of a premature baby — at any time, whether recent or past.',
  'Contact us directly and in complete confidence. Self-referral or referral by healthcare providers welcome.',
  true,
  9
),
(
  'professional-hospital-partnerships',
  'Professional & Hospital Partnerships',
  'Advocacy',
  'Strengthening systems, saving lives.',
  'Collaborating with healthcare institutions, training neonatal staff, and advocating for better neonatal care policies across Rwanda.',
  'Sustainable change in neonatal outcomes requires systemic action. Our Professional and Hospital Partnerships program works alongside Rwanda''s healthcare institutions to strengthen neonatal care from within. We collaborate with NICU staff on family-centered care approaches, provide training on parent communication and psychosocial support, partner on research initiatives, advocate for improved neonatal health policies, and build bridges between hospitals and community health workers. By partnering with the professionals who care for premature babies every day, we multiply our impact far beyond what any single organization could achieve alone.',
  'https://images.pexels.com/photos/12793736/pexels-photo-12793736.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Shield',
  '["Neonatal staff collaboration and training", "Family-centered care partnerships", "Hospital awareness and sensitization initiatives", "Neonatal research and data partnerships", "Health policy advocacy", "Community health worker outreach programs"]',
  'Healthcare professionals, hospital administrators, neonatal nurses, community health workers, and policymakers.',
  'Institutional partnerships by formal request. Individual healthcare professionals welcome at our training events.',
  true,
  10
)
ON CONFLICT (slug) DO NOTHING;

-- ── 20260529100639_replace_team_members_with_correct_info.sql ──
/*
  # Replace team members with correct information

  1. Changes
    - Soft-deletes all existing team members
    - Inserts 4 new team members with correct names and roles:
      - Dr Jocelyne Bukeyeneza (Founder/CEO, Neonatologist)
      - Dr Uwurukundo (Head of Programs, Pediatrician, 20+ years)
      - Secyiza Fridoline (Community Manager, Businesswoman, preemie mother)
      - Pediatricians Team at KFH (Medical Advisors)
    - No image URLs set (placeholder design will be used)

  2. Notes
    - Old entries preserved via soft delete
    - New entries have sequential sort_order for proper display
*/

-- Soft-delete all existing team members
UPDATE team_members
SET deleted_at = now(), active = false
WHERE deleted_at IS NULL;

-- Insert 4 new team members
INSERT INTO team_members (name, role, bio, image_url, email, sort_order, active)
VALUES
  (
    'Dr Jocelyne Bukeyeneza',
    'Founder & CEO',
    'Neonatologist and passionate advocate for premature babies and their families in Rwanda. Founded Voice of Preemies to bridge the gap between hospital care and family support.',
    '',
    '',
    1,
    true
  ),
  (
    'Dr Uwurukundo',
    'Head of Programs',
    'Pediatrician with over 20 years of experience in neonatal care across Rwanda, dedicated to improving outcomes for premature and critically ill newborns.',
    '',
    '',
    2,
    true
  ),
  (
    'Secyiza Fridoline',
    'Community Manager',
    'Businesswoman and mother of a premature infant. Bridges families with the support, resources, and community they need during and after the NICU journey.',
    '',
    '',
    3,
    true
  ),
  (
    'Pediatricians Team at KFH',
    'Medical Advisors',
    'A dedicated team of pediatricians at King Faisal Hospital providing clinical guidance, medical expertise, and evidence-based direction for our education and care programs.',
    '',
    '',
    4,
    true
  );

-- ── 20260529100952_update_program_images_african_context.sql ──
/*
  # Update program images to African context

  1. Changes
    - Updates all 10 program image_url values
    - Replaces generic stock photos with Africa-specific medical/family imagery
    - All images sourced from Pexels (free to use, no attribution required)

  2. Programs Updated
    - Parent Emotional Support: African mother cradling newborn
    - NICU Family Support: Doctor attending newborns in incubator (Uganda)
    - Kangaroo Mother Care: African mother holding baby close
    - Breastfeeding & Nutrition: Mother breastfeeding baby in African attire
    - Father & Family Inclusion: African family with newborn
    - Parent Support Communities: African women in community gathering
    - Financial & Practical Assistance: African community sharing resources
    - Education & Awareness: Nurse caring for child in African hospital
    - Bereavement & Loss Support: Compassionate care scene
    - Professional & Hospital Partnerships: African nurse with newborn in hospital
*/

UPDATE programs SET image_url = 'https://images.pexels.com/photos/35260459/pexels-photo-35260459.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'parent-emotional-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185199/pexels-photo-34185199.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'nicu-family-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810971/pexels-photo-33810971.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'kangaroo-mother-care' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810970/pexels-photo-33810970.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'breastfeeding-nutrition-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810963/pexels-photo-33810963.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'father-family-inclusion' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33512002/pexels-photo-33512002.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'parent-support-communities' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33763200/pexels-photo-33763200.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'financial-practical-assistance' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185202/pexels-photo-34185202.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'education-awareness' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/6392851/pexels-photo-6392851.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'bereavement-loss-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185205/pexels-photo-34185205.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'professional-hospital-partnerships' AND deleted_at IS NULL;

-- ── 20260530074847_update_program_images_with_cloudinary_urls.sql ──
/*
  # Update program images with real Cloudinary photos

  1. Changes
    - Replaces all 10 program image URLs with real Voice of Preemies photos hosted on Cloudinary
    - Images include actual team photos, NICU moments, community events, and support sessions

  2. Programs Updated
    - Parent Emotional Support: Supportive conversation scene
    - NICU Family Support: Tender moment in the NICU
    - Kangaroo Mother Care: Holding hands in neonatal care
    - Breastfeeding & Nutrition: Serene moments in a cozy nursery
    - Father & Family Inclusion: Community health presentation in marquee tent
    - Parent Support Communities: Celebration under the festive tent
    - Financial & Practical Assistance: Akagofero community photo
    - Education & Awareness: Educational/awareness illustration
    - Bereavement & Loss Support: Supportive conversation in a cozy space
    - Professional & Hospital Partnerships: NICU team celebration in purple tones
*/

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Supportive_conversation_in_a_cozy_space_mh9heg.png'
WHERE slug = 'parent-emotional-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Tender_moment_in_the_NICU_vkmzge.png'
WHERE slug = 'nicu-family-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Holding_hands_in_neonatal_care_dnak8z.png'
WHERE slug = 'kangaroo-mother-care' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Serene_moments_in_a_cozy_nursery_t13cjj.png'
WHERE slug = 'breastfeeding-nutrition-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126642/Community_health_presentation_in_marquee_tent_dbwivt.png'
WHERE slug = 'father-family-inclusion' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126643/Celebration_under_the_festive_tent_j7fy2h.png'
WHERE slug = 'parent-support-communities' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/akagofero_r83ks8.png'
WHERE slug = 'financial-practical-assistance' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126643/ChatGPT_Image_May_30_2026_09_35_16_AM_gyllzm.png'
WHERE slug = 'education-awareness' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Supportive_conversation_in_a_cozy_space_mh9heg.png'
WHERE slug = 'bereavement-loss-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126644/NICU_team_celebration_in_purple_tones_nmvlnv.png'
WHERE slug = 'professional-hospital-partnerships' AND deleted_at IS NULL;

-- ── 20260602080559_create_join_requests_table.sql ──
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

-- ── 20260602082137_make_join_requests_email_nullable.sql ──
/*
  # Make email nullable on join_requests

  Parents and family members may not have email addresses.
  This migration makes the email column nullable so phone-only signups are possible.

  1. Modified Tables
    - `join_requests`
      - `email` changed from NOT NULL to nullable
*/

ALTER TABLE join_requests ALTER COLUMN email DROP NOT NULL;

-- ── 20260602090924_add_phone_to_contact_submissions.sql ──
/*
  # Add phone column to contact_submissions

  The contact form collects an optional phone number but the table
  doesn't have a matching column. This migration adds it.

  Changes:
  - `contact_submissions`: add nullable `phone` text column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_submissions' AND column_name = 'phone'
  ) THEN
    ALTER TABLE contact_submissions ADD COLUMN phone text DEFAULT NULL;
  END IF;
END $$;

-- ── 20260608093410_create_donation_commitments_table.sql ──
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

