/*
  # Home Care service management

  Voice of Preemies places professional nurses and trained baby caregivers with
  families (home or hospital). Two shifts: Day 08:00-20:00, Night 20:00-08:00 (Kigali time).

  Money flow:  parent pays VoP  ->  after each completed shift VoP pays the worker
               (rate - coordination fee).  Nurse 50,000 - 10,000 = 40,000.
               Caregiver 30,000 - 5,000 = 25,000.

  Tables
    care_services        the two services with their current rate and fee
    care_staff           nurses and caregivers (photo, MoMo number, email, status)
    care_families        the parents / clients
    care_contracts       one parent agreement: service, dates, weekdays, shift type
    care_shifts          one row per scheduled shift, with a price snapshot
    care_payments_in     money received from parents
    care_payouts         money owed to / paid to workers - created automatically
                         when a shift is marked completed
    care_requests        "Request a nurse" submissions from the public website

  Rules enforced here (not just in the screens)
    * a worker can only be given a shift of their own type (nurse vs caregiver)
    * a worker works at most ONE shift per day
    * a shift cannot be completed before it starts, or without a worker
    * completing a shift creates the payout; un-completing removes it unless already paid
    * a paid payout is locked
    * everything is restricted to people who may use the "homecare" page

  All access goes through has_page_access('homecare'): super admins, plus any role
  the admin has granted Home Care to. Nothing is readable by the public.
*/

-- ─────────────────────────────────────────────────────────────────────────
-- Services (current price list; contracts and shifts keep their own snapshot)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_services (
  code text PRIMARY KEY CHECK (code IN ('nurse', 'caregiver')),
  label text NOT NULL,
  rate_per_shift integer NOT NULL CHECK (rate_per_shift > 0),
  coordination_fee integer NOT NULL CHECK (coordination_fee >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coordination_fee < rate_per_shift)
);
INSERT INTO care_services (code, label, rate_per_shift, coordination_fee) VALUES
  ('nurse', 'Professional Nursing Care', 50000, 10000),
  ('caregiver', 'Trained Baby Caregiver', 30000, 5000)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Staff
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('nurse', 'caregiver')),
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
  phone text NOT NULL DEFAULT '',
  momo_number text NOT NULL DEFAULT '',
  momo_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  national_id text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  qualifications text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  contract_signed_on date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────
-- Families (parents)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
  national_id text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'fr', 'rw')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────
-- Contracts
-- ─────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS care_contract_seq;

CREATE TABLE IF NOT EXISTS care_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT (
    'HC-' || to_char(now() AT TIME ZONE 'Africa/Kigali', 'YYYY') || '-' || lpad(nextval('care_contract_seq')::text, 4, '0')
  ),
  family_id uuid NOT NULL REFERENCES care_families(id) ON DELETE RESTRICT,
  service_code text NOT NULL REFERENCES care_services(code),
  -- Copied from care_services by a trigger when the contract is created (checks run after triggers).
  rate_per_shift integer NOT NULL CHECK (rate_per_shift > 0),
  coordination_fee integer NOT NULL CHECK (coordination_fee >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  weekdays smallint[] NOT NULL CHECK (cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
  shift_type text NOT NULL CHECK (shift_type IN ('day', 'night', 'both')),
  location_type text NOT NULL DEFAULT 'home' CHECK (location_type IN ('home', 'hospital')),
  location_detail text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr', 'rw')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  signed_on date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (end_date >= start_date),
  CHECK (end_date - start_date <= 366)
);
CREATE INDEX IF NOT EXISTS care_contracts_family_idx ON care_contracts (family_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Shifts
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES care_contracts(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('day', 'night')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  staff_id uuid REFERENCES care_staff(id) ON DELETE SET NULL,
  rate_per_shift integer NOT NULL DEFAULT 0,
  coordination_fee integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  completed_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, shift_date, shift)
);
CREATE INDEX IF NOT EXISTS care_shifts_date_idx ON care_shifts (shift_date);
CREATE INDEX IF NOT EXISTS care_shifts_staff_idx ON care_shifts (staff_id, shift_date);
-- A worker works at most one shift a day.
CREATE UNIQUE INDEX IF NOT EXISTS care_shifts_one_per_day
  ON care_shifts (staff_id, shift_date) WHERE staff_id IS NOT NULL AND status IN ('scheduled', 'completed');

-- ─────────────────────────────────────────────────────────────────────────
-- Payments in (from parents) and payouts (to workers)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_payments_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES care_contracts(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Kigali')::date),
  method text NOT NULL DEFAULT 'momo' CHECK (method IN ('momo', 'cash', 'bank', 'other')),
  kind text NOT NULL DEFAULT 'weekly' CHECK (kind IN ('commitment', 'weekly', 'balance', 'other')),
  reference text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS care_payments_in_contract_idx ON care_payments_in (contract_id);

CREATE TABLE IF NOT EXISTS care_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL UNIQUE REFERENCES care_shifts(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES care_staff(id) ON DELETE RESTRICT,
  gross integer NOT NULL,
  fee integer NOT NULL,
  net integer NOT NULL CHECK (net >= 0),
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid')),
  paid_on date,
  method text NOT NULL DEFAULT 'momo' CHECK (method IN ('momo', 'cash', 'bank', 'other')),
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'due' OR paid_on IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS care_payouts_staff_idx ON care_payouts (staff_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- Requests from the public website
-- ─────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS care_request_seq;

CREATE TABLE IF NOT EXISTS care_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('REQ-' || lpad(nextval('care_request_seq')::text, 5, '0')),
  parent_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  service text NOT NULL DEFAULT 'unsure' CHECK (service IN ('nurse', 'caregiver', 'unsure')),
  shift text NOT NULL DEFAULT 'unsure' CHECK (shift IN ('day', 'night', 'both', 'unsure')),
  start_date date,
  duration_note text NOT NULL DEFAULT '',
  location_type text NOT NULL DEFAULT 'home' CHECK (location_type IN ('home', 'hospital')),
  location_detail text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'declined')),
  family_id uuid REFERENCES care_families(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────
-- Link documents (signed contracts, ID copies) to families / staff / contracts
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS care_family_id uuid REFERENCES care_families(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS care_staff_id uuid REFERENCES care_staff(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS care_contract_id uuid REFERENCES care_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS documents_care_family_idx ON documents (care_family_id) WHERE care_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_care_staff_idx ON documents (care_staff_id) WHERE care_staff_id IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════
-- Triggers
-- ═════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION care_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS care_staff_touch ON care_staff;
CREATE TRIGGER care_staff_touch BEFORE UPDATE ON care_staff FOR EACH ROW EXECUTE FUNCTION care_touch_updated_at();
DROP TRIGGER IF EXISTS care_families_touch ON care_families;
CREATE TRIGGER care_families_touch BEFORE UPDATE ON care_families FOR EACH ROW EXECUTE FUNCTION care_touch_updated_at();
DROP TRIGGER IF EXISTS care_contracts_touch ON care_contracts;
CREATE TRIGGER care_contracts_touch BEFORE UPDATE ON care_contracts FOR EACH ROW EXECUTE FUNCTION care_touch_updated_at();
DROP TRIGGER IF EXISTS care_shifts_touch ON care_shifts;
CREATE TRIGGER care_shifts_touch BEFORE UPDATE ON care_shifts FOR EACH ROW EXECUTE FUNCTION care_touch_updated_at();

-- A new contract copies the current price list, so later price changes never alter it.
CREATE OR REPLACE FUNCTION care_contract_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s care_services%ROWTYPE;
BEGIN
  SELECT * INTO s FROM care_services WHERE code = NEW.service_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown service'; END IF;
  IF NEW.rate_per_shift IS NULL OR NEW.rate_per_shift <= 0 THEN NEW.rate_per_shift := s.rate_per_shift; END IF;
  IF NEW.coordination_fee IS NULL THEN NEW.coordination_fee := s.coordination_fee; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS care_contract_snapshot ON care_contracts;
CREATE TRIGGER care_contract_snapshot BEFORE INSERT ON care_contracts FOR EACH ROW EXECUTE FUNCTION care_contract_before_insert();

-- A contract that has money or completed work attached can be cancelled, but not deleted.
CREATE OR REPLACE FUNCTION care_contract_guard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (SELECT 1 FROM care_payments_in WHERE contract_id = OLD.id AND deleted_at IS NULL)
       OR EXISTS (SELECT 1 FROM care_shifts WHERE contract_id = OLD.id AND status = 'completed') THEN
      RAISE EXCEPTION 'This contract has payments or completed shifts. Cancel it instead of deleting it.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS care_contract_delete_guard ON care_contracts;
CREATE TRIGGER care_contract_delete_guard BEFORE UPDATE OF deleted_at ON care_contracts FOR EACH ROW EXECUTE FUNCTION care_contract_guard_delete();

-- Shift validation + price snapshot.
CREATE OR REPLACE FUNCTION care_shift_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c care_contracts%ROWTYPE; st care_staff%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO c FROM care_contracts WHERE id = NEW.contract_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
    NEW.rate_per_shift := c.rate_per_shift;
    NEW.coordination_fee := c.coordination_fee;
  END IF;

  IF NEW.staff_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.staff_id IS DISTINCT FROM OLD.staff_id) THEN
    SELECT * INTO c FROM care_contracts WHERE id = NEW.contract_id;
    SELECT * INTO st FROM care_staff WHERE id = NEW.staff_id;
    IF st.deleted_at IS NOT NULL OR st.status <> 'active' THEN
      RAISE EXCEPTION '% is not active and cannot be given shifts.', st.full_name;
    END IF;
    IF st.role <> c.service_code THEN
      RAISE EXCEPTION '% is a % but this contract is for a %.', st.full_name, st.role, c.service_code;
    END IF;
  END IF;

  IF NEW.status = 'completed' THEN
    IF NEW.staff_id IS NULL THEN RAISE EXCEPTION 'Assign a nurse or caregiver before marking the shift completed.'; END IF;
    IF NEW.starts_at > now() THEN RAISE EXCEPTION 'This shift has not started yet, so it cannot be marked completed.'; END IF;
    IF NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS care_shift_validate ON care_shifts;
CREATE TRIGGER care_shift_validate BEFORE INSERT OR UPDATE ON care_shifts FOR EACH ROW EXECUTE FUNCTION care_shift_before();

-- Completing a shift creates the payout; undoing it removes the payout unless it was already paid.
CREATE OR REPLACE FUNCTION care_shift_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p care_payouts%ROWTYPE;
BEGIN
  SELECT * INTO p FROM care_payouts WHERE shift_id = NEW.id;

  IF NEW.status = 'completed' THEN
    IF FOUND THEN
      IF p.status = 'paid' THEN
        IF p.staff_id IS DISTINCT FROM NEW.staff_id THEN
          RAISE EXCEPTION 'This shift has already been paid out to someone else and cannot be reassigned.';
        END IF;
      ELSE
        UPDATE care_payouts
           SET staff_id = NEW.staff_id, gross = NEW.rate_per_shift, fee = NEW.coordination_fee,
               net = NEW.rate_per_shift - NEW.coordination_fee
         WHERE id = p.id;
      END IF;
    ELSE
      INSERT INTO care_payouts (shift_id, staff_id, gross, fee, net)
      VALUES (NEW.id, NEW.staff_id, NEW.rate_per_shift, NEW.coordination_fee, NEW.rate_per_shift - NEW.coordination_fee);
    END IF;
  ELSIF FOUND THEN
    IF p.status = 'paid' THEN
      RAISE EXCEPTION 'The worker has already been paid for this shift. Mark the payout as unpaid first if this was a mistake.';
    END IF;
    DELETE FROM care_payouts WHERE id = p.id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS care_shift_payout ON care_shifts;
CREATE TRIGGER care_shift_payout AFTER INSERT OR UPDATE ON care_shifts FOR EACH ROW EXECUTE FUNCTION care_shift_after();

-- ═════════════════════════════════════════════════════════════════════════
-- Shift generation: makes the shifts match the contract pattern.
-- Adds missing shifts; removes scheduled ones that no longer fit (never completed ones).
-- Weekday numbers follow JavaScript/Postgres EXTRACT(dow): 0 = Sunday.
-- ═════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION care_sync_shifts(p_contract uuid)
RETURNS TABLE (added integer, removed integer)
LANGUAGE plpgsql
AS $$
DECLARE
  c care_contracts%ROWTYPE;
  d date;
  sh text;
  n_added integer := 0;
  n_removed integer := 0;
  rc integer;
BEGIN
  SELECT * INTO c FROM care_contracts WHERE id = p_contract AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF c.status = 'cancelled' THEN RAISE EXCEPTION 'This contract is cancelled.'; END IF;

  DELETE FROM care_shifts s
   WHERE s.contract_id = c.id AND s.status = 'scheduled'
     AND NOT (
       s.shift_date BETWEEN c.start_date AND c.end_date
       AND EXTRACT(dow FROM s.shift_date)::smallint = ANY (c.weekdays)
       AND (c.shift_type = 'both' OR c.shift_type = s.shift)
     );
  GET DIAGNOSTICS n_removed = ROW_COUNT;

  FOR d IN SELECT g::date FROM generate_series(c.start_date, c.end_date, interval '1 day') g LOOP
    IF EXTRACT(dow FROM d)::smallint = ANY (c.weekdays) THEN
      FOREACH sh IN ARRAY (CASE c.shift_type WHEN 'both' THEN ARRAY['day', 'night'] ELSE ARRAY[c.shift_type] END) LOOP
        INSERT INTO care_shifts (contract_id, shift_date, shift, starts_at, ends_at)
        VALUES (
          c.id, d, sh,
          CASE sh WHEN 'day' THEN (d + time '08:00') AT TIME ZONE 'Africa/Kigali' ELSE (d + time '20:00') AT TIME ZONE 'Africa/Kigali' END,
          CASE sh WHEN 'day' THEN (d + time '20:00') AT TIME ZONE 'Africa/Kigali' ELSE (d + 1 + time '08:00') AT TIME ZONE 'Africa/Kigali' END
        )
        ON CONFLICT (contract_id, shift_date, shift) DO NOTHING;
        GET DIAGNOSTICS rc = ROW_COUNT;
        n_added := n_added + rc;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT n_added, n_removed;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════
-- Totals (views run with the caller's rights, so row security still applies)
-- ═════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW care_contract_totals WITH (security_invoker = true) AS
SELECT
  c.id AS contract_id,
  COALESCE(s.billable_shifts, 0) AS billable_shifts,
  COALESCE(s.completed_shifts, 0) AS completed_shifts,
  COALESCE(s.unassigned_shifts, 0) AS unassigned_shifts,
  COALESCE(s.billable_shifts, 0) * c.rate_per_shift AS amount_due,
  COALESCE(p.paid, 0) AS amount_paid,
  COALESCE(s.billable_shifts, 0) * c.rate_per_shift - COALESCE(p.paid, 0) AS balance
FROM care_contracts c
LEFT JOIN (
  SELECT contract_id,
         count(*) FILTER (WHERE status IN ('scheduled', 'completed')) AS billable_shifts,
         count(*) FILTER (WHERE status = 'completed') AS completed_shifts,
         count(*) FILTER (WHERE status = 'scheduled' AND staff_id IS NULL) AS unassigned_shifts
  FROM care_shifts GROUP BY contract_id
) s ON s.contract_id = c.id
LEFT JOIN (
  SELECT contract_id, sum(amount)::bigint AS paid FROM care_payments_in WHERE deleted_at IS NULL GROUP BY contract_id
) p ON p.contract_id = c.id;

CREATE OR REPLACE VIEW care_staff_totals WITH (security_invoker = true) AS
SELECT
  st.id AS staff_id,
  COALESCE(sh.shifts_completed, 0) AS shifts_completed,
  COALESCE(sh.shifts_upcoming, 0) AS shifts_upcoming,
  COALESCE(po.earned, 0) AS earned,
  COALESCE(po.paid, 0) AS paid,
  COALESCE(po.due, 0) AS due,
  COALESCE(po.fees, 0) AS fees_generated
FROM care_staff st
LEFT JOIN (
  SELECT staff_id,
         count(*) FILTER (WHERE status = 'completed') AS shifts_completed,
         count(*) FILTER (WHERE status = 'scheduled' AND ends_at >= now()) AS shifts_upcoming
  FROM care_shifts WHERE staff_id IS NOT NULL GROUP BY staff_id
) sh ON sh.staff_id = st.id
LEFT JOIN (
  SELECT staff_id,
         sum(net)::bigint AS earned,
         sum(net) FILTER (WHERE status = 'paid')::bigint AS paid,
         sum(net) FILTER (WHERE status = 'due')::bigint AS due,
         sum(fee)::bigint AS fees
  FROM care_payouts GROUP BY staff_id
) po ON po.staff_id = st.id;

-- ═════════════════════════════════════════════════════════════════════════
-- Row security: Home Care users only. Nothing is public.
-- ═════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['care_services', 'care_staff', 'care_families', 'care_contracts', 'care_shifts', 'care_payments_in', 'care_payouts', 'care_requests']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon, public', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('GRANT ALL ON %I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "home_care_access" ON %I', t);
    EXECUTE format('CREATE POLICY "home_care_access" ON %I FOR ALL TO authenticated USING (has_page_access(''homecare'')) WITH CHECK (has_page_access(''homecare''))', t);
  END LOOP;
END $$;

GRANT USAGE ON SEQUENCE care_contract_seq, care_request_seq TO authenticated, service_role;
REVOKE ALL ON care_contract_totals, care_staff_totals FROM anon, public;
GRANT SELECT ON care_contract_totals, care_staff_totals TO authenticated;
GRANT SELECT ON care_contract_totals, care_staff_totals TO service_role;
REVOKE ALL ON FUNCTION care_sync_shifts(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION care_sync_shifts(uuid) TO authenticated;

-- ═════════════════════════════════════════════════════════════════════════
-- Documents: categories for contracts and templates
-- ═════════════════════════════════════════════════════════════════════════
-- The existing, empty "Nurse Contracts" category becomes the combined staff category.
UPDATE document_categories SET name = 'Nurse/Caregiver Contracts'
 WHERE deleted_at IS NULL AND lower(btrim(name)) = 'nurse contracts'
   AND NOT EXISTS (SELECT 1 FROM document_categories WHERE deleted_at IS NULL AND lower(btrim(name)) = 'nurse/caregiver contracts');

INSERT INTO document_categories (name, color, icon, sort_order)
SELECT v.name, v.color, 'FileText', v.ord
FROM (VALUES
  ('Parent Service Contracts', '#7C3AED', 10),
  ('Nurse/Caregiver Contracts', '#0A6070', 11),
  ('Templates', '#E8A020', 12)
) AS v(name, color, ord)
WHERE NOT EXISTS (SELECT 1 FROM document_categories dc WHERE dc.deleted_at IS NULL AND lower(btrim(dc.name)) = lower(v.name));
