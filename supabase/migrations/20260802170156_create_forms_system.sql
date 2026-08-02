/*
  # Create generic Forms system + seed the first form

  ## Purpose
  A schema-driven, reusable public forms system. Creating a new form (with its own
  set of questions) is a pure data operation via the dashboard "Forms" builder —
  no code changes are ever needed for a new form.

  ## New Tables

  ### forms
  - `id` (uuid, primary key)
  - `slug` (text, unique) — public URL at /forms/:slug
  - `title_en` / `title_rw` (text) — bilingual title
  - `description_en` / `description_rw` (text, default '') — bilingual short description
  - `status` (text, default 'open') — 'open' | 'closed'. Closing a form only stops new
    public submissions; existing responses are untouched.
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) — soft delete, project-wide convention

  ### form_questions
  - `id` (uuid, primary key)
  - `form_id` (uuid, references forms) — cascades on delete
  - `position` (int) — display order
  - `label_en` / `label_rw` (text) — bilingual question label, rendered together as
    "English (Kinyarwanda)" on the public form
  - `type` (text) — 'short_text' | 'phone' | 'multiple_choice'
  - `options` (jsonb, nullable) — array of {en, rw} pairs for multiple_choice; null otherwise
  - `allow_other` (boolean, default false) — adds a free-text "Other" choice to multiple_choice
  - `required` (boolean, default true)
  - `created_at` (timestamptz)

  ### form_responses
  - `id` (uuid, primary key)
  - `form_id` (uuid, references forms) — cascades on delete
  - `answers` (jsonb) — { [question_id]: answer_text }. Multiple-choice answers are
    stored as the human-readable option text (or the free-text "Other" value), never
    a raw id, so the admin response table needs no lookup to display them.
  - `created_at` (timestamptz)
  - `deleted_at` (timestamptz, nullable) — soft delete

  ## Security
  - RLS enabled on all three tables.
  - `forms` / `form_questions`: anon + authenticated can SELECT (excluding soft-deleted
    forms) — these two tables hold no personal data and the public /forms and
    /forms/:slug pages must be able to render without a login. This is a deliberate,
    necessary deviation from a stricter "authenticated-only SELECT everywhere" default:
    without it, the public-facing pages this feature exists to serve couldn't function.
    Only `authenticated` can INSERT/UPDATE forms and form_questions (the admin builder).
  - `form_responses`: this is the sensitive table (names, phone numbers, free-text
    answers). Only `authenticated` can SELECT/UPDATE/DELETE. `anon` + `authenticated`
    can INSERT, but only into a form that is currently `status = 'open'` and not
    soft-deleted — enforced via a WITH CHECK subquery against `forms`.
*/

CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_rw text NOT NULL,
  description_en text DEFAULT '',
  description_rw text DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_forms" ON forms
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "authenticated_insert_forms" ON forms
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_forms" ON forms
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  position int NOT NULL,
  label_en text NOT NULL,
  label_rw text NOT NULL,
  type text NOT NULL,
  options jsonb,
  allow_other boolean NOT NULL DEFAULT false,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_form_questions" ON form_questions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "authenticated_insert_form_questions" ON form_questions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_form_responses_when_open" ON form_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_responses.form_id AND f.status = 'open' AND f.deleted_at IS NULL
    )
  );

CREATE POLICY "authenticated_select_form_responses" ON form_responses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_update_form_responses" ON form_responses
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: first form — Expert Preterm Parent Training Application
-- Kinyarwanda text is a best-effort translation, not reviewed by a native
-- speaker — flagged for Dr. Jocelyne / Fridoline to proofread and correct
-- directly in these rows (or via the admin builder) before this goes live.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_form_id uuid;
BEGIN
  INSERT INTO forms (slug, title_en, title_rw, description_en, description_rw, status)
  VALUES (
    'expert-preterm-parent-training-application',
    'Expert Preterm Parent Training — Application',
    'Amasomo y''Ababyeyi b''Inzobere — Ifishi yo Kwiyandikisha',
    'Application for the inaugural Expert Preterm Parent Training, 10–12 September 2026. Fridoline Secyiza will follow up with applicants.',
    'Ifishi yo kwiyandikisha mu masomo ya mbere y''Ababyeyi b''Inzobere ku bana bavutse mbere y''igihe, azabera ku itariki ya 10–12 Nzeri 2026. Fridoline Secyiza azavugana n''abiyandikishije.',
    'open'
  )
  RETURNING id INTO v_form_id;

  INSERT INTO form_questions (form_id, position, label_en, label_rw, type, options, allow_other, required) VALUES
    (v_form_id, 1, 'Full Name', 'Amazina yombi', 'short_text', NULL, false, true),
    (v_form_id, 2, 'Age Range', 'Imyaka ufite', 'multiple_choice',
      '[{"en":"18–24","rw":"18-24"},{"en":"25–29","rw":"25-29"},{"en":"30–34","rw":"30-34"},{"en":"35–39","rw":"35-39"},{"en":"40 and above","rw":"40 no hejuru"}]'::jsonb,
      false, true),
    (v_form_id, 3, 'Residence or Neighborhood', 'Aho utuye / Umudugudu', 'short_text', NULL, false, true),
    (v_form_id, 4, 'Profession', 'Umwuga', 'short_text', NULL, false, false),
    (v_form_id, 5, 'Telephone / Contact', 'Numero ya telefoni', 'phone', NULL, false, true),
    (v_form_id, 6, 'Delivery Site', 'Aho wabyariye', 'multiple_choice',
      '[{"en":"King Faisal Hospital","rw":"King Faisal Hospital"},{"en":"Kanombe Hospital","rw":"Kanombe Hospital"},{"en":"CHUK","rw":"CHUK"}]'::jsonb,
      true, true);
END $$;
