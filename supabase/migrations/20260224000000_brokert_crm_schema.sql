-- ============================================================
-- BrokerT CRM Schema
-- Migration: 20260224000000_brokert_crm_schema.sql
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 2. ENUMs
-- ============================================================

CREATE TYPE unit_status AS ENUM (
  'available', 'blocked', 'sin_abono',
  'reserved', 'sold', 'released', 'inactive'
);

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');

CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

CREATE TYPE lead_status AS ENUM (
  'available',    -- Visible in table for all sellers (no contact info)
  'reserved',     -- Exclusively reserved by one seller
  'contacted',    -- Seller made first contact
  'meeting_set',  -- Appointment created
  'in_progress',  -- Active negotiation
  'converted',    -- Sale closed
  'lost',         -- Deal not closed
  'released'      -- Enum value kept for history, release_lead() returns to available
);

CREATE TYPE lead_quality AS ENUM ('cold', 'warm', 'hot', 'premium');

CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'completed',
  'no_show', 'cancelled', 'rescheduled'
);

CREATE TYPE reservation_status AS ENUM (
  'active', 'in_progress', 'sold', 'cancelled', 'released'
);

CREATE TYPE note_type AS ENUM (
  'note', 'call', 'email', 'meeting', 'status_change', 'file_upload'
);

-- ============================================================
-- 3. REAL ESTATE COMPANIES (no dependencies)
-- ============================================================

CREATE TABLE real_estate_companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT,
  logo_url     TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. SELLER PROFILES (depends on auth.users)
-- ============================================================

CREATE TABLE seller_profiles (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                   TEXT NOT NULL,
  email                       TEXT NOT NULL,
  phone                       TEXT,
  company_name                TEXT,
  rut                         TEXT UNIQUE CHECK (rut ~ '^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$'),
  avatar_url                  TEXT,
  is_verified                 BOOLEAN DEFAULT false,
  is_active                   BOOLEAN DEFAULT true,
  cal_com_user_id             TEXT,
  google_calendar_connected   BOOLEAN DEFAULT false,
  outlook_calendar_connected  BOOLEAN DEFAULT false,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PROJECTS (depends on real_estate_companies)
-- ============================================================

CREATE TABLE projects (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES real_estate_companies(id),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  commune                   TEXT NOT NULL,
  city                      TEXT,
  region                    TEXT,

  -- Policies
  estimated_delivery        TEXT,
  reception_date            DATE,
  toku_installments         INT,
  payment_conditions        JSONB,

  -- Promotions
  bonus_pie                 DECIMAL(5,4),
  initial_payment           TEXT,
  guaranteed_rent           TEXT,
  guaranteed_rent_amounts   JSONB,
  additional_conditions     TEXT,
  market_rent_amounts       JSONB,
  promotions_extra          JSONB,

  -- Metadata
  source_file               TEXT,
  source_sheet              TEXT,
  total_units               INT,
  available_units           INT,
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_commune ON projects(commune);

-- ============================================================
-- 6. UNITS (depends on projects, seller_profiles)
--    reservation_id FK added later after reservations is created
-- ============================================================

CREATE TABLE units (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Normalized fields
  unit_number              TEXT NOT NULL,
  status                   unit_status NOT NULL DEFAULT 'available',
  original_status          TEXT,
  orientation              TEXT,
  typology                 TEXT,
  unit_type                TEXT,

  -- Surface (m2)
  surface_useful           DECIMAL(10,2),
  surface_terrace          DECIMAL(10,2),
  surface_weighted         DECIMAL(10,2),
  surface_total            DECIMAL(10,2),

  -- Prices (UF)
  list_price               DECIMAL(14,2),
  discount                 DECIMAL(10,2),
  final_price              DECIMAL(14,2),
  deed_price               DECIMAL(14,2),
  uf_per_m2                DECIMAL(10,2),

  -- Parking and storage (count, not price)
  parking                  INT DEFAULT 0,
  storage                  INT DEFAULT 0,

  -- Financing
  bonus_percentage         DECIMAL(5,4),
  bonus_uf                 DECIMAL(14,2),
  mortgage_max_percentage  DECIMAL(5,4),
  mortgage_max_uf          DECIMAL(14,2),
  pie_percentage           DECIMAL(5,4),
  pie_uf                   DECIMAL(14,2),
  pie_clp                  DECIMAL(14,2),

  -- Payment plans
  installments_plan1       INT,
  monthly_payment_plan1    DECIMAL(14,2),
  installments_plan2       INT,
  monthly_payment_plan2    DECIMAL(14,2),

  -- Profitability
  rent_estimate            DECIMAL(14,2),
  mortgage_payment         DECIMAL(14,2),
  cash_flow                DECIMAL(14,2),
  min_income               DECIMAL(14,2),

  -- Reservation
  reserved_by              UUID REFERENCES seller_profiles(id),
  reserved_at              TIMESTAMPTZ,
  reservation_id           UUID, -- FK constraint added below after reservations is created

  -- Raw import data
  raw_data                 JSONB NOT NULL DEFAULT '{}',
  extra_fields             JSONB DEFAULT '{}',

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_project     ON units(project_id);
CREATE INDEX idx_units_status      ON units(status);
CREATE INDEX idx_units_available   ON units(project_id, status) WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_typology    ON units(typology)           WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_price       ON units(final_price)        WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_reserved_by ON units(reserved_by)        WHERE reserved_by IS NOT NULL;

-- ============================================================
-- 7. UF VALUES (no dependencies)
-- ============================================================

CREATE TABLE uf_values (
  date  DATE PRIMARY KEY,
  value DECIMAL(12,2) NOT NULL
);

-- Seed data: approximate UF values 2025-2026
INSERT INTO uf_values (date, value) VALUES
  ('2025-01-01', 38706.35),
  ('2025-02-01', 38773.89),
  ('2025-03-01', 38839.44),
  ('2025-04-01', 38850.12),
  ('2025-05-01', 38927.00),
  ('2025-06-01', 39010.45),
  ('2025-07-01', 39088.11),
  ('2025-08-01', 39154.62),
  ('2025-09-01', 39225.74),
  ('2025-10-01', 39298.48),
  ('2025-11-01', 39375.29),
  ('2025-12-01', 39450.00),
  ('2026-01-01', 39530.00),
  ('2026-02-01', 39615.00);

-- ============================================================
-- 8. SUBSCRIPTIONS (depends on seller_profiles)
--    Generic payment provider columns (not stripe-specific)
-- ============================================================

CREATE TABLE subscriptions (
  id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                        UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  tier                             subscription_tier NOT NULL DEFAULT 'free',
  status                           subscription_status NOT NULL DEFAULT 'active',
  payment_provider_subscription_id TEXT UNIQUE,
  payment_provider_customer_id     TEXT,
  current_period_start             TIMESTAMPTZ,
  current_period_end               TIMESTAMPTZ,
  monthly_reservations_included    INT NOT NULL DEFAULT 3,
  created_at                       TIMESTAMPTZ DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SELLER ACCOUNTS (depends on seller_profiles)
--    current_period_start/end for action-based plan reset
-- ============================================================

CREATE TABLE seller_accounts (
  seller_id                    UUID PRIMARY KEY REFERENCES seller_profiles(id) ON DELETE CASCADE,
  available_credits            INT NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  plan_reservations_remaining  INT NOT NULL DEFAULT 3,
  total_credits_purchased      INT NOT NULL DEFAULT 0,
  total_credits_used           INT NOT NULL DEFAULT 0,
  lifetime_lead_reservations   INT NOT NULL DEFAULT 0,
  lifetime_unit_reservations   INT NOT NULL DEFAULT 0,
  current_period_start         TIMESTAMPTZ DEFAULT NOW(),
  current_period_end           TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. CREDIT PURCHASES (depends on seller_profiles)
--     Generic payment provider column (not stripe-specific)
-- ============================================================

CREATE TABLE credit_purchases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                  UUID NOT NULL REFERENCES seller_profiles(id),
  credits_amount             INT NOT NULL,
  price_paid                 DECIMAL(10,2) NOT NULL,
  currency                   TEXT NOT NULL DEFAULT 'CLP',
  payment_provider_intent_id TEXT UNIQUE,
  status                     TEXT NOT NULL DEFAULT 'pending',
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. LEADS (depends on seller_profiles)
--     Contact info hidden until reserved
-- ============================================================

CREATE TABLE leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id             TEXT,

  -- === PUBLIC INFO (visible in TanStack Table for all) ===
  quality_tier            lead_quality NOT NULL DEFAULT 'cold',
  score                   INT DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  age                     INT,
  age_range               TEXT,
  occupation              TEXT,
  estimated_income        INT,
  estimated_income_range  TEXT,
  current_commune         TEXT,
  family_size             INT,
  preferred_typology      TEXT,
  budget_min              DECIMAL(14,2),
  budget_max              DECIMAL(14,2),
  preferred_communes      TEXT[],

  -- === HIDDEN INFO (only visible after reserving) ===
  full_name               TEXT NOT NULL,
  email                   TEXT,
  phone                   TEXT,
  rut                     TEXT UNIQUE CHECK (rut ~ '^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$'),
  additional_contact_info JSONB,

  -- === STATUS & RESERVATION ===
  status                  lead_status NOT NULL DEFAULT 'available',
  reserved_by             UUID REFERENCES seller_profiles(id),
  reserved_at             TIMESTAMPTZ,

  -- Source and cost
  source                  TEXT,
  source_campaign         TEXT,
  acquisition_cost        DECIMAL(10,2),

  -- Extensible metadata
  metadata                JSONB DEFAULT '{}',

  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for TanStack Table filters
CREATE INDEX idx_leads_available  ON leads(status, score DESC) WHERE status = 'available';
CREATE INDEX idx_leads_age        ON leads(age)               WHERE status = 'available';
CREATE INDEX idx_leads_income     ON leads(estimated_income)  WHERE status = 'available';
CREATE INDEX idx_leads_occupation ON leads(occupation)        WHERE status = 'available';
CREATE INDEX idx_leads_score      ON leads(score DESC)        WHERE status = 'available';
CREATE INDEX idx_leads_reserved_by ON leads(reserved_by)      WHERE reserved_by IS NOT NULL;
CREATE INDEX idx_leads_metadata   ON leads USING gin(metadata);

-- ============================================================
-- 12. LEADS BROWSABLE VIEW
--     Hides contact data unless current user owns the reservation
-- ============================================================

CREATE OR REPLACE VIEW leads_browsable AS
SELECT
  id,
  quality_tier,
  score,
  age,
  age_range,
  occupation,
  estimated_income,
  estimated_income_range,
  current_commune,
  family_size,
  preferred_typology,
  budget_min,
  budget_max,
  preferred_communes,
  status,
  metadata,
  created_at,
  -- Contact info: only revealed if this seller reserved the lead
  CASE WHEN reserved_by = auth.uid() THEN full_name ELSE NULL END AS full_name,
  CASE WHEN reserved_by = auth.uid() THEN email     ELSE NULL END AS email,
  CASE WHEN reserved_by = auth.uid() THEN phone     ELSE NULL END AS phone,
  CASE WHEN reserved_by = auth.uid() THEN rut       ELSE NULL END AS rut
FROM leads
WHERE status = 'available' OR reserved_by = auth.uid();

-- ============================================================
-- 13. APPOINTMENTS (depends on seller_profiles, leads)
--     Only on leads reserved by the seller
-- ============================================================

CREATE TABLE appointments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                   UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id                     UUID NOT NULL REFERENCES leads(id),

  title                       TEXT NOT NULL,
  description                 TEXT,
  scheduled_at                TIMESTAMPTZ NOT NULL,
  duration_minutes            INT NOT NULL DEFAULT 30,
  location                    TEXT,
  meeting_type                TEXT,

  -- External calendar integration
  external_calendar_event_id  TEXT,
  cal_com_booking_id          TEXT,
  calendar_provider           TEXT,

  -- Status and outcome
  status                      appointment_status NOT NULL DEFAULT 'scheduled',
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  outcome_notes               TEXT,
  outcome                     TEXT, -- 'interested', 'not_interested', 'needs_followup', 'ready_to_reserve'

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_seller ON appointments(seller_id, scheduled_at);
CREATE INDEX idx_appointments_lead   ON appointments(lead_id);

-- ============================================================
-- 14. RESERVATIONS (depends on units, seller_profiles, leads, appointments)
--     EXCLUDE constraint ensures only one active reservation per unit
-- ============================================================

CREATE TABLE reservations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        UUID NOT NULL REFERENCES units(id),
  seller_id      UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id        UUID REFERENCES leads(id),
  appointment_id UUID REFERENCES appointments(id),

  status         reservation_status NOT NULL DEFAULT 'active',
  reserved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT,

  sold_at        TIMESTAMPTZ,
  sale_price     DECIMAL(14,2),
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  released_at    TIMESTAMPTZ,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),

  -- One unit can only have ONE active reservation at a time
  CONSTRAINT unique_active_unit_reservation
    EXCLUDE USING btree (unit_id WITH =)
    WHERE (status IN ('active', 'in_progress'))
);

CREATE INDEX idx_reservations_seller ON reservations(seller_id, status);
CREATE INDEX idx_reservations_unit   ON reservations(unit_id);

-- ============================================================
-- 15. RESERVATION NOTES (depends on reservations, seller_profiles)
-- ============================================================

CREATE TABLE reservation_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seller_id      UUID NOT NULL REFERENCES seller_profiles(id),
  type           note_type NOT NULL DEFAULT 'note',
  content        TEXT NOT NULL,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. RESERVATION FILES (depends on reservations, seller_profiles)
-- ============================================================

CREATE TABLE reservation_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seller_id      UUID NOT NULL REFERENCES seller_profiles(id),
  file_name      TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  file_size      INT,
  storage_path   TEXT NOT NULL,
  mime_type      TEXT,
  description    TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. STOCK IMPORTS (depends on real_estate_companies)
-- ============================================================

CREATE TABLE stock_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       TEXT NOT NULL,
  company_id      UUID REFERENCES real_estate_companies(id),
  sheets_imported TEXT[],
  units_imported  INT,
  units_skipped   INT,
  column_mapping  JSONB,
  errors          JSONB,
  imported_by     UUID,
  imported_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. TRANSACTION LOG (depends on seller_profiles, leads, units, reservations)
-- ============================================================

CREATE TABLE transaction_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id        UUID REFERENCES leads(id),
  unit_id        UUID REFERENCES units(id),
  reservation_id UUID REFERENCES reservations(id),
  type           TEXT NOT NULL, -- 'lead_reservation', 'unit_reservation', 'credit_purchase', etc.
  credits        INT,
  amount_money   DECIMAL(10,2),
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_seller ON transaction_log(seller_id, created_at DESC);

-- ============================================================
-- 19. ALTER UNITS — add FK to reservations (circular dependency)
--     units ↔ reservations: resolved post-creation
-- ============================================================

ALTER TABLE units
  ADD CONSTRAINT fk_units_reservation
  FOREIGN KEY (reservation_id) REFERENCES reservations(id);

-- ============================================================
-- 20. TRIGGER FUNCTION: update_updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at_real_estate_companies
  BEFORE UPDATE ON real_estate_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_seller_profiles
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_units
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_seller_accounts
  BEFORE UPDATE ON seller_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at_reservations
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 21. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- check_and_reset_plan: replaces pg_cron
-- Called inside reserve_lead() before charging.
-- If current_period_end < NOW(), resets plan_reservations_remaining
-- and advances the period by one month.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_and_reset_plan(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account      RECORD;
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_account FROM seller_accounts
  WHERE seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If the billing period has ended, reset remaining reservations
  IF v_account.current_period_end < NOW() THEN
    -- Look up active subscription to determine included reservations
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE seller_id = p_seller_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    UPDATE seller_accounts
    SET
      plan_reservations_remaining = COALESCE(v_subscription.monthly_reservations_included, 3),
      current_period_start        = NOW(),
      current_period_end          = NOW() + INTERVAL '1 month'
    WHERE seller_id = p_seller_id;
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- reserve_lead: exclusive lead reservation, charges credits/plan
-- Calls check_and_reset_plan() before charging.
-- Uses FOR UPDATE NOWAIT to prevent double-reservation.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION reserve_lead(
  p_lead_id   UUID,
  p_seller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead        RECORD;
  v_seller      RECORD;
  v_credit_cost INT;
BEGIN
  -- 1. Check and reset plan period if needed (no-op if still active)
  PERFORM check_and_reset_plan(p_seller_id);

  -- 2. Lock lead row (NOWAIT prevents silent double-reservation)
  SELECT * INTO v_lead FROM leads
  WHERE id = p_lead_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_NOT_FOUND');
  END IF;

  IF v_lead.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_ALREADY_RESERVED');
  END IF;

  -- 3. Lock and check seller account
  SELECT * INTO v_seller FROM seller_accounts
  WHERE seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_NOT_FOUND');
  END IF;

  v_credit_cost := CASE v_lead.quality_tier
    WHEN 'premium' THEN 4
    WHEN 'hot'     THEN 3
    WHEN 'warm'    THEN 2
    ELSE 1
  END;

  -- 4. Charge: use plan reservations first, then credits
  IF v_seller.plan_reservations_remaining > 0 THEN
    UPDATE seller_accounts
    SET plan_reservations_remaining = plan_reservations_remaining - 1
    WHERE seller_id = p_seller_id;
    v_credit_cost := 0;
  ELSIF v_seller.available_credits >= v_credit_cost THEN
    UPDATE seller_accounts
    SET available_credits  = available_credits  - v_credit_cost,
        total_credits_used = total_credits_used + v_credit_cost
    WHERE seller_id = p_seller_id;
  ELSE
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'INSUFFICIENT_CREDITS',
      'required',  v_credit_cost,
      'available', v_seller.available_credits
    );
  END IF;

  -- 5. Reserve lead
  UPDATE leads
  SET status      = 'reserved',
      reserved_by = p_seller_id,
      reserved_at = NOW()
  WHERE id = p_lead_id;

  -- 6. Update lifetime stats
  UPDATE seller_accounts
  SET lifetime_lead_reservations = lifetime_lead_reservations + 1
  WHERE seller_id = p_seller_id;

  -- 7. Audit log
  INSERT INTO transaction_log (seller_id, lead_id, type, credits, created_at)
  VALUES (p_seller_id, p_lead_id, 'lead_reservation', -v_credit_cost, NOW());

  -- 8. Return with contact data now revealed
  RETURN jsonb_build_object(
    'success',      true,
    'credits_used', v_credit_cost,
    'lead', jsonb_build_object(
      'id',          v_lead.id,
      'full_name',   v_lead.full_name,
      'email',       v_lead.email,
      'phone',       v_lead.phone,
      'rut',         v_lead.rut,
      'score',       v_lead.score,
      'quality_tier', v_lead.quality_tier
    )
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_BEING_PROCESSED');
END;
$$;

-- ------------------------------------------------------------
-- reserve_unit: exclusive unit reservation, NO credit charge
-- Lead was already paid for; this links lead ↔ unit.
-- Uses FOR UPDATE NOWAIT + EXCLUDE constraint as dual guard.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION reserve_unit(
  p_unit_id        UUID,
  p_seller_id      UUID,
  p_lead_id        UUID DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit           RECORD;
  v_reservation_id UUID;
BEGIN
  -- 1. Lock unit row with project and company info
  SELECT u.*, p.name AS project_name, p.commune, c.name AS company_name
  INTO v_unit
  FROM units u
  JOIN projects p              ON u.project_id  = p.id
  JOIN real_estate_companies c ON p.company_id  = c.id
  WHERE u.id = p_unit_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_NOT_FOUND');
  END IF;

  -- 2. Check availability (available, sin_abono, or previously released)
  IF v_unit.status NOT IN ('available', 'sin_abono', 'released') THEN
    RETURN jsonb_build_object(
      'success',        false,
      'error',          'UNIT_NOT_AVAILABLE',
      'current_status', v_unit.status
    );
  END IF;

  -- 3. If lead provided, verify seller owns that lead reservation
  IF p_lead_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM leads
      WHERE id = p_lead_id AND reserved_by = p_seller_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'LEAD_NOT_RESERVED_BY_YOU');
    END IF;
  END IF;

  -- 4. Create reservation (no credit charge)
  INSERT INTO reservations (unit_id, seller_id, lead_id, appointment_id, status, reserved_at)
  VALUES (p_unit_id, p_seller_id, p_lead_id, p_appointment_id, 'active', NOW())
  RETURNING id INTO v_reservation_id;

  -- 5. Mark unit as reserved
  UPDATE units
  SET status         = 'reserved',
      reserved_by    = p_seller_id,
      reserved_at    = NOW(),
      reservation_id = v_reservation_id
  WHERE id = p_unit_id;

  -- 6. Advance lead status if linked
  IF p_lead_id IS NOT NULL THEN
    UPDATE leads SET status = 'in_progress' WHERE id = p_lead_id;
  END IF;

  -- 7. Lifetime stats and audit log
  UPDATE seller_accounts
  SET lifetime_unit_reservations = lifetime_unit_reservations + 1
  WHERE seller_id = p_seller_id;

  INSERT INTO transaction_log (seller_id, unit_id, reservation_id, lead_id, type, created_at)
  VALUES (p_seller_id, p_unit_id, v_reservation_id, p_lead_id, 'unit_reservation', NOW());

  RETURN jsonb_build_object(
    'success',        true,
    'reservation_id', v_reservation_id,
    'unit', jsonb_build_object(
      'id',          v_unit.id,
      'unit_number', v_unit.unit_number,
      'project',     v_unit.project_name,
      'commune',     v_unit.commune,
      'company',     v_unit.company_name,
      'final_price', v_unit.final_price,
      'typology',    v_unit.typology
    )
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_BEING_PROCESSED');
  WHEN exclusion_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_ALREADY_RESERVED');
END;
$$;

-- ------------------------------------------------------------
-- release_lead: lead returns to the pool (status = 'available')
-- MODIFIED from planV3: sets status to 'available' (not 'released')
-- so the lead can be reserved again by any seller.
-- Credits are NOT refunded (seller already accessed contact info).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION release_lead(
  p_lead_id   UUID,
  p_seller_id UUID,
  p_reason    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
BEGIN
  SELECT * INTO v_lead FROM leads
  WHERE id = p_lead_id AND reserved_by = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_NOT_FOUND_OR_NOT_YOURS');
  END IF;

  -- Cannot release if there is an active unit reservation for this lead
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE lead_id = p_lead_id AND status IN ('active', 'in_progress')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'HAS_ACTIVE_UNIT_RESERVATION',
      'message', 'Libere primero la reserva de unidad antes de liberar el lead'
    );
  END IF;

  -- Lead returns to pool: available for any seller again
  UPDATE leads
  SET status      = 'available',
      reserved_by = NULL,
      reserved_at = NULL
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------
-- release_unit: releases an active unit reservation
-- Unit status returns to 'released' (re-reservable by anyone).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION release_unit(
  p_reservation_id UUID,
  p_seller_id      UUID,
  p_reason         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE id = p_reservation_id AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
  END IF;

  IF v_reservation.status IN ('sold', 'released', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLOSED');
  END IF;

  UPDATE reservations
  SET status        = 'released',
      released_at   = NOW(),
      cancel_reason = p_reason
  WHERE id = p_reservation_id;

  UPDATE units
  SET status         = 'released',
      reserved_by    = NULL,
      reserved_at    = NULL,
      reservation_id = NULL
  WHERE id = v_reservation.unit_id;

  RETURN jsonb_build_object('success', true, 'unit_id', v_reservation.unit_id);
END;
$$;

-- ------------------------------------------------------------
-- mark_unit_sold: closes the deal on a unit reservation
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_unit_sold(
  p_reservation_id UUID,
  p_seller_id      UUID,
  p_sale_price     DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE id = p_reservation_id AND seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
  END IF;

  UPDATE reservations
  SET status     = 'sold',
      sold_at    = NOW(),
      sale_price = p_sale_price
  WHERE id = p_reservation_id;

  UPDATE units SET status = 'sold' WHERE id = v_reservation.unit_id;

  -- Mark linked lead as converted
  IF v_reservation.lead_id IS NOT NULL THEN
    UPDATE leads SET status = 'converted' WHERE id = v_reservation.lead_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 22. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE real_estate_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE units                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_files      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_imports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_log        ENABLE ROW LEVEL SECURITY;

-- Real estate companies: authenticated users read
CREATE POLICY "read_companies" ON real_estate_companies
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Projects: authenticated users read
CREATE POLICY "read_projects" ON projects
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Units: authenticated users read
CREATE POLICY "read_units" ON units
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Seller profiles: own profile only
CREATE POLICY "own_profile" ON seller_profiles
  AS PERMISSIVE FOR ALL TO authenticated USING (id = auth.uid());

-- Subscriptions: own subscriptions only
CREATE POLICY "own_subscriptions" ON subscriptions
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Seller accounts: own account only
CREATE POLICY "own_account" ON seller_accounts
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Leads: see available leads (no contact) OR own reserved leads (with contact)
CREATE POLICY "browse_and_own_leads" ON leads
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (status = 'available' OR reserved_by = auth.uid());

-- Appointments: own appointments only
CREATE POLICY "own_appointments" ON appointments
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Reservations: own reservations only
CREATE POLICY "own_reservations" ON reservations
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Reservation notes: own notes only
CREATE POLICY "own_notes" ON reservation_notes
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Reservation files: own files only
CREATE POLICY "own_files" ON reservation_files
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Transaction log: own transactions only (read-only for sellers)
CREATE POLICY "own_transactions" ON transaction_log
  AS PERMISSIVE FOR SELECT TO authenticated USING (seller_id = auth.uid());

-- uf_values: no RLS needed (public reference data, no sensitive info)
-- stock_imports: service_role bypasses RLS; no seller policy needed

-- ============================================================
-- 23. GRANTS
-- ============================================================

-- real_estate_companies (public read)
GRANT SELECT ON real_estate_companies TO anon, authenticated;
GRANT ALL    ON real_estate_companies TO service_role;

-- seller_profiles
GRANT SELECT, INSERT, UPDATE ON seller_profiles TO authenticated;
GRANT ALL                    ON seller_profiles TO service_role;

-- projects (public read)
GRANT SELECT ON projects TO anon, authenticated;
GRANT ALL    ON projects TO service_role;

-- units (authenticated read; writes via service_role or SECURITY DEFINER functions)
GRANT SELECT ON units TO anon, authenticated;
GRANT ALL    ON units TO service_role;

-- uf_values (public reference data)
GRANT SELECT ON uf_values TO anon, authenticated;
GRANT ALL    ON uf_values TO service_role;

-- subscriptions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT ALL                    ON subscriptions TO service_role;

-- seller_accounts (read-only for authenticated; mutations via SECURITY DEFINER)
GRANT SELECT ON seller_accounts TO authenticated;
GRANT ALL    ON seller_accounts TO service_role;

-- credit_purchases
GRANT SELECT, INSERT ON credit_purchases TO authenticated;
GRANT ALL            ON credit_purchases TO service_role;

-- leads (read-only for authenticated; mutations via SECURITY DEFINER functions)
GRANT SELECT ON leads TO authenticated;
GRANT ALL    ON leads TO service_role;

-- leads_browsable view
GRANT SELECT ON leads_browsable TO authenticated;
GRANT ALL    ON leads_browsable TO service_role;

-- appointments
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT ALL                            ON appointments TO service_role;

-- reservations (read + insert; updates via SECURITY DEFINER functions)
GRANT SELECT, INSERT, UPDATE ON reservations TO authenticated;
GRANT ALL                    ON reservations TO service_role;

-- reservation_notes
GRANT SELECT, INSERT, UPDATE, DELETE ON reservation_notes TO authenticated;
GRANT ALL                            ON reservation_notes TO service_role;

-- reservation_files
GRANT SELECT, INSERT, UPDATE, DELETE ON reservation_files TO authenticated;
GRANT ALL                            ON reservation_files TO service_role;

-- stock_imports (admin only via service_role)
GRANT ALL ON stock_imports TO service_role;

-- transaction_log (read-only for authenticated)
GRANT SELECT ON transaction_log TO authenticated;
GRANT ALL    ON transaction_log TO service_role;

-- RPC functions (callable via supabase.rpc() by authenticated users)
GRANT EXECUTE ON FUNCTION reserve_lead(UUID, UUID)                     TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_unit(UUID, UUID, UUID, UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION release_lead(UUID, UUID, TEXT)               TO authenticated;
GRANT EXECUTE ON FUNCTION release_unit(UUID, UUID, TEXT)               TO authenticated;
GRANT EXECUTE ON FUNCTION mark_unit_sold(UUID, UUID, DECIMAL)          TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_reset_plan(UUID)                   TO service_role;
