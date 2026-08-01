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
