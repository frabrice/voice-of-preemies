/*
  # Online doctor / nurse consultation booking

  ## Purpose
  Parents book a 30-minute one-on-one consultation with a provider, pay a
  5,000 RWF booking fee via MoMo (full consultation is 10,000 RWF; the balance
  is settled outside the website), and an admin confirms the payment.
  Providers, specialties and weekly availability are plain data managed from
  the dashboard, so adding another doctor or nurse needs no code change.

  ## New Tables
  - `consult_specialties` — categories (e.g. Newborn Care)
  - `consult_providers` — doctors / nurses; `notify_email` is private
  - `consult_availability` — weekly recurring windows (0 = Sunday ... 6 = Saturday, Kigali time)
  - `consult_time_off` — whole-day blocks (leave, holidays)
  - `consult_bookings` — one row per booking; status pending -> confirmed -> completed,
    or cancelled / expired

  ## Time handling
  Availability is stored as local Kigali wall-clock times and converted with
  `AT TIME ZONE 'Africa/Kigali'` so results never depend on the viewer's or the
  server's time zone.

  ## Slot rules (single source of truth: consult_available_slots)
  - Bookable from now + 3 hours up to 14 days ahead
  - A pending (unpaid) booking holds its slot for 24 hours, then the slot reopens
  - Confirmed and completed bookings always hold their slot

  ## Security
  - RLS on every table. Bookings hold names, phone numbers and health-related
    notes, so there is NO anon access to the table at all: the public booking
    page creates bookings only through an edge function (service role), and
    reads availability only through `consult_available_slots`, which returns
    bare timestamps and no personal data.
  - Providers are exposed publicly only through the `consult_providers_public`
    view, which omits the private notification email and hides inactive rows.
  - `consult_create_booking` is executable by service_role only.
*/

CREATE TABLE IF NOT EXISTS consult_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS consult_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid REFERENCES consult_specialties(id),
  title text NOT NULL DEFAULT '',
  full_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  notify_email text,
  slot_minutes int NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 10 AND 120),
  booking_fee int NOT NULL DEFAULT 5000 CHECK (booking_fee >= 0),
  full_fee int NOT NULL DEFAULT 10000 CHECK (full_fee >= 0),
  active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS consult_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES consult_providers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS consult_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES consult_providers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS consult_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  provider_id uuid NOT NULL REFERENCES consult_providers(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('call', 'in_person')),
  parent_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  topic text,
  baby_age text,
  payer_name text NOT NULL,
  booking_fee int NOT NULL,
  full_fee int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'expired')),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- One live booking per provider per slot. Cancelled / expired rows free the slot.
CREATE UNIQUE INDEX IF NOT EXISTS consult_bookings_active_slot
  ON consult_bookings (provider_id, starts_at)
  WHERE status IN ('pending', 'confirmed', 'completed') AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS consult_bookings_starts_at_idx ON consult_bookings (starts_at);
CREATE INDEX IF NOT EXISTS consult_availability_provider_idx ON consult_availability (provider_id);

-- ─── Row level security ────────────────────────────────────────────────────

ALTER TABLE consult_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_consult_specialties" ON consult_specialties
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "authenticated_insert_consult_specialties" ON consult_specialties
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_consult_specialties" ON consult_specialties
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_consult_providers" ON consult_providers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_consult_providers" ON consult_providers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_consult_providers" ON consult_providers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_consult_availability" ON consult_availability
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_consult_availability" ON consult_availability
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_consult_availability" ON consult_availability
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_consult_availability" ON consult_availability
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select_consult_time_off" ON consult_time_off
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_consult_time_off" ON consult_time_off
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_delete_consult_time_off" ON consult_time_off
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select_consult_bookings" ON consult_bookings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_consult_bookings" ON consult_bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ─── Public provider view (no private columns, active providers only) ──────

CREATE OR REPLACE VIEW consult_providers_public AS
SELECT
  p.id,
  p.specialty_id,
  s.name AS specialty_name,
  p.title,
  p.full_name,
  p.headline,
  p.bio,
  p.photo_url,
  p.slot_minutes,
  p.booking_fee,
  p.full_fee,
  p.position
FROM consult_providers p
LEFT JOIN consult_specialties s ON s.id = p.specialty_id AND s.deleted_at IS NULL
WHERE p.active = true AND p.deleted_at IS NULL;

GRANT SELECT ON consult_providers_public TO anon, authenticated;

-- ─── Open slots (public, returns bare timestamps only) ─────────────────────

CREATE OR REPLACE FUNCTION consult_available_slots(p_provider uuid, p_from date, p_to date)
RETURNS SETOF timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH prov AS (
    SELECT id, slot_minutes
    FROM consult_providers
    WHERE id = p_provider AND active = true AND deleted_at IS NULL
  ),
  bounds AS (
    SELECT
      GREATEST(COALESCE(p_from, (now() AT TIME ZONE 'Africa/Kigali')::date), (now() AT TIME ZONE 'Africa/Kigali')::date) AS d_from,
      LEAST(COALESCE(p_to, (now() AT TIME ZONE 'Africa/Kigali')::date + 14), (now() AT TIME ZONE 'Africa/Kigali')::date + 14) AS d_to
  ),
  days AS (
    SELECT g::date AS day
    FROM bounds, generate_series(bounds.d_from::timestamp, bounds.d_to::timestamp, interval '1 day') AS g
  ),
  windows AS (
    SELECT days.day, prov.slot_minutes, a.start_time, a.end_time
    FROM days
    JOIN consult_availability a ON a.weekday = EXTRACT(DOW FROM days.day)::int
    JOIN prov ON prov.id = a.provider_id
  ),
  slots AS (
    SELECT
      w.day AS local_day,
      (w.day + w.start_time + (n.i * w.slot_minutes) * interval '1 minute') AS local_start,
      w.day + w.end_time AS local_window_end,
      w.slot_minutes
    FROM windows w
    CROSS JOIN LATERAL generate_series(0, 200) AS n(i)
  )
  SELECT DISTINCT (s.local_start AT TIME ZONE 'Africa/Kigali') AS slot_start
  FROM slots s
  WHERE s.local_start + s.slot_minutes * interval '1 minute' <= s.local_window_end
    AND (s.local_start AT TIME ZONE 'Africa/Kigali') >= now() + interval '3 hours'
    AND NOT EXISTS (
      SELECT 1 FROM consult_time_off t
      WHERE t.provider_id = p_provider AND s.local_day BETWEEN t.start_date AND t.end_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM consult_bookings b
      WHERE b.provider_id = p_provider
        AND b.starts_at = (s.local_start AT TIME ZONE 'Africa/Kigali')
        AND b.deleted_at IS NULL
        AND (
          b.status IN ('confirmed', 'completed')
          OR (b.status = 'pending' AND b.created_at > now() - interval '24 hours')
        )
    )
  ORDER BY slot_start;
$$;

GRANT EXECUTE ON FUNCTION consult_available_slots(uuid, date, date) TO anon, authenticated;

-- ─── Create a booking (edge function / service role only) ──────────────────

CREATE OR REPLACE FUNCTION consult_create_booking(
  p_provider uuid,
  p_starts_at timestamptz,
  p_mode text,
  p_parent_name text,
  p_phone text,
  p_email text,
  p_topic text,
  p_baby_age text,
  p_payer_name text
)
RETURNS consult_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prov consult_providers;
  local_day date;
  is_open boolean;
  pending_count int;
  ref text;
  result consult_bookings;
BEGIN
  SELECT * INTO prov FROM consult_providers WHERE id = p_provider AND active = true AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'provider_unavailable';
  END IF;

  -- Free the slot if its previous unpaid hold has lapsed
  UPDATE consult_bookings
  SET status = 'expired'
  WHERE provider_id = p_provider
    AND starts_at = p_starts_at
    AND status = 'pending'
    AND created_at <= now() - interval '24 hours';

  local_day := (p_starts_at AT TIME ZONE 'Africa/Kigali')::date;
  SELECT EXISTS (
    SELECT 1 FROM consult_available_slots(p_provider, local_day, local_day) s WHERE s = p_starts_at
  ) INTO is_open;
  IF NOT is_open THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Guard against one person (or a bot) holding many unpaid slots
  SELECT count(*) INTO pending_count
  FROM consult_bookings
  WHERE deleted_at IS NULL
    AND status = 'pending'
    AND created_at > now() - interval '24 hours'
    AND (lower(email) = lower(p_email) OR phone = p_phone);
  IF pending_count >= 2 THEN
    RAISE EXCEPTION 'too_many_pending';
  END IF;

  ref := 'VOP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO consult_bookings (
    reference, provider_id, starts_at, ends_at, mode, parent_name, phone, email,
    topic, baby_age, payer_name, booking_fee, full_fee
  ) VALUES (
    ref, p_provider, p_starts_at, p_starts_at + prov.slot_minutes * interval '1 minute', p_mode,
    p_parent_name, p_phone, p_email, NULLIF(p_topic, ''), NULLIF(p_baby_age, ''), p_payer_name,
    prov.booking_fee, prov.full_fee
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION consult_create_booking(uuid, timestamptz, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consult_create_booking(uuid, timestamptz, text, text, text, text, text, text, text) TO service_role;

-- ─── Seed: specialties, the three providers from Dr. Jocelyne's schedule ───
-- Deborah's surname, title and role are not yet known, so she is seeded
-- inactive (hidden from the public page) until the details are completed in
-- the dashboard and she is switched on.

DO $$
DECLARE
  sp_newborn uuid;
  sp_parent uuid;
  p_jo uuid;
  p_deb uuid;
  p_frido uuid;
BEGIN
  INSERT INTO consult_specialties (name, position) VALUES ('Newborn Care', 1) RETURNING id INTO sp_newborn;
  INSERT INTO consult_specialties (name, position) VALUES ('Parent Support', 2) RETURNING id INTO sp_parent;

  INSERT INTO consult_providers (specialty_id, title, full_name, headline, position, active)
  VALUES (sp_newborn, 'Dr.', 'Jocelyne Bukeyeneza', 'Newborn Specialist', 1, true)
  RETURNING id INTO p_jo;

  INSERT INTO consult_providers (specialty_id, title, full_name, headline, position, active)
  VALUES (sp_parent, '', 'Deborah', '', 2, false)
  RETURNING id INTO p_deb;

  INSERT INTO consult_providers (specialty_id, title, full_name, headline, position, active)
  VALUES (sp_parent, '', 'Fridoline Secyiza', '', 3, true)
  RETURNING id INTO p_frido;

  -- Dr. Jocelyne: Mon, Tue, Thu, Fri 17:00-20:00
  INSERT INTO consult_availability (provider_id, weekday, start_time, end_time) VALUES
    (p_jo, 1, '17:00', '20:00'),
    (p_jo, 2, '17:00', '20:00'),
    (p_jo, 4, '17:00', '20:00'),
    (p_jo, 5, '17:00', '20:00');

  -- Deborah: Wed 14:00-17:00
  INSERT INTO consult_availability (provider_id, weekday, start_time, end_time) VALUES
    (p_deb, 3, '14:00', '17:00');

  -- Fridoline: Sun 14:00-18:00
  INSERT INTO consult_availability (provider_id, weekday, start_time, end_time) VALUES
    (p_frido, 0, '14:00', '18:00');
END $$;
