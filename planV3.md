# Plan Estratégico v5: CRM de Venta Directa de Propiedades

> **Instrucción permanente**: Cada vez que se agregue información nueva al proyecto, se debe re-analizar el schema completo y la solución explicitada en el plan para corroborar que está óptimo con la nueva información.

---

## 1. Flujo Real de la Plataforma (Definitivo)

```
1. EXPLORACIÓN DE LEADS
   Vendedor abre tabla de leads (TanStack Table)
   Filtra por: edad, ocupación, renta, score
   Ve info parcial (SIN datos de contacto)

2. RESERVA DE LEAD (Exclusiva — cuesta créditos/suscripción)
   Vendedor reserva el lead → paga crédito o usa cupo del plan
   Se revelan datos de contacto (nombre, email, teléfono)
   Nadie más puede reservar ese lead
   El lead desaparece de la tabla de otros vendedores

3. AGENDAMIENTO (Reunión)
   Vendedor contacta al lead y agenda reunión
   Se integra con calendario (Google/Outlook via Cal.com)

4. RESERVA DE UNIDAD (Exclusiva — post-reunión exitosa)
   Si la reunión es exitosa →
   Vendedor reserva una UNIDAD específica para ese lead
   La unidad queda bloqueada exclusivamente (indefinida)

5. GESTIÓN Y CIERRE
   Vendedor gestiona el proceso de venta
   Sube archivos si es necesario
   Marca como vendida o libera
```

### ¿Por qué doble reserva?

| Reserva de Lead | Reserva de Unidad |
|-----------------|-------------------|
| Protege al lead de ser contactado por múltiples vendedores | Protege la propiedad de ser ofrecida a múltiples compradores |
| Es el punto de monetización principal (créditos/suscripción) | Es la vinculación lead ↔ propiedad para cerrar la venta |
| Revela datos de contacto | Bloquea la unidad del stock disponible |
| Exclusiva e indefinida (hasta cierre o liberación) | Exclusiva e indefinida (hasta venta o liberación) |

---

## 2. Análisis del Stock Real

### Estructura

```
Paz (5 proyectos): Atelier, Mercado Serrano, Plaza Lira, Seminario 2, San Francisco
Delabase (6 proyectos): Volcan, Biaut, San Nicolás, Carvajal, Don Claudio, Don Diego
Metra (2 proyectos): Macul View, Ñuñoa View

Total: 3 inmobiliarias, 13 proyectos, ~1,500 unidades
```

### Diferencias de Columnas

Cada inmobiliaria nombra las columnas diferente. Solución: columnas normalizadas + `raw_data` JSONB + column mappings por inmobiliaria. MVP: data estática importada de Excel.

---

## 3. Modelo de Negocio

### Punto de Monetización: Reserva de Lead

El momento en que el vendedor paga es al **reservar un lead** (obtener exclusividad + datos de contacto). La reserva de unidad no tiene costo adicional (ya pagó por el lead).

| Opción | Mecánica | Recomendación |
|--------|----------|---------------|
| **A: Pago por Reserva** | $15–60 USD por lead según score | Bueno para validar |
| **B: Suscripción** | Starter $49/mes (5 reservas), Pro $149/mes (20) | MRR predecible |
| **C: Freemium + Créditos** | Gratis para ver, créditos para reservar | Baja fricción |
| **D: Híbrido (MVP)** | Suscripción $39/mes (3 reservas) + extra $15-40 | **Recomendado** |

---

## 4. Schema de Base de Datos

### Cambios vs v4

| Elemento | v4 | v5 (actual) |
|----------|-----|-------------|
| Leads | Sin exclusividad, todo público | **Exclusivos**: `reserved_by`, status, datos de contacto ocultos pre-reserva |
| `reserve_lead()` | Eliminada | **Restaurada** — función atómica con `FOR UPDATE NOWAIT` |
| `reserve_unit()` | Único punto de reserva | Se mantiene como segundo punto de reserva |
| Créditos | Se cobran en reserva de unidad | Se cobran en **reserva de lead** |
| `leads_browsable` view | Eliminada | **Restaurada** — oculta datos de contacto |
| `reserve_unit()` | Cobra créditos | **No cobra créditos** — ya se pagó en el lead |
| `appointments` | Se crea sobre lead público | Se crea sobre **lead reservado** por el vendedor |

```sql
-- ============================================================
-- ORDEN DE MIGRACIÓN (resuelve todas las dependencias de FK)
-- ============================================================
-- 1.  real_estate_companies  (sin dependencias)
-- 2.  seller_profiles        (depende de auth.users)
-- 3.  projects               (depende de real_estate_companies)
-- 4.  units                  (depende de projects, seller_profiles)
-- 5.  uf_values              (sin dependencias)
-- 6.  subscriptions + seller_accounts + credit_purchases (dependen de seller_profiles)
-- 7.  leads                  (depende de seller_profiles)
-- 8.  appointments           (depende de seller_profiles, leads)
-- 9.  reservations           (depende de units, seller_profiles, leads, appointments)
-- 10. reservation_notes      (depende de reservations, seller_profiles)
-- 11. reservation_files      (depende de reservations, seller_profiles)
-- 12. stock_imports          (depende de real_estate_companies)
-- 13. transaction_log        (depende de seller_profiles, leads, units, reservations)
-- 14. ALTER units ADD FK     (circular: units ↔ reservations, resuelto post-creación)
-- 15. Views, functions, RLS policies, cron jobs
-- ============================================================

-- ============================================================
-- 1. INMOBILIARIAS
-- ============================================================

CREATE TABLE real_estate_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USUARIOS (antes de units/leads que lo referencian)
-- ============================================================

CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  rut TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  cal_com_user_id TEXT,
  google_calendar_connected BOOLEAN DEFAULT false,
  outlook_calendar_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PROYECTOS
-- ============================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES real_estate_companies(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  commune TEXT NOT NULL,
  city TEXT,
  region TEXT,

  -- Políticas
  estimated_delivery TEXT,
  reception_date DATE,
  toku_installments INT,
  payment_conditions JSONB,

  -- Promos
  bonus_pie DECIMAL(5,4),
  initial_payment TEXT,
  guaranteed_rent TEXT,
  guaranteed_rent_amounts JSONB,
  additional_conditions TEXT,
  market_rent_amounts JSONB,
  promotions_extra JSONB,

  -- Metadata
  source_file TEXT,
  source_sheet TEXT,
  total_units INT,
  available_units INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_commune ON projects(commune);

-- ============================================================
-- 4. UNIDADES (puede referenciar seller_profiles y projects)
-- ============================================================

CREATE TYPE unit_status AS ENUM (
  'available', 'blocked', 'sin_abono',
  'reserved', 'sold', 'released', 'inactive'
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Campos normalizados
  unit_number TEXT NOT NULL,
  status unit_status NOT NULL DEFAULT 'available',
  original_status TEXT,
  orientation TEXT,
  typology TEXT,
  unit_type TEXT,

  -- Superficies (m2)
  surface_useful DECIMAL(10,2),
  surface_terrace DECIMAL(10,2),
  surface_weighted DECIMAL(10,2),
  surface_total DECIMAL(10,2),

  -- Precios (UF)
  list_price DECIMAL(14,2),
  discount DECIMAL(10,2),
  final_price DECIMAL(14,2),
  deed_price DECIMAL(14,2),
  uf_per_m2 DECIMAL(10,2),

  -- Estacionamiento y Bodega
  parking DECIMAL(10,2) DEFAULT 0,
  storage DECIMAL(10,2) DEFAULT 0,

  -- Financiamiento
  bonus_percentage DECIMAL(5,4),
  bonus_uf DECIMAL(14,2),
  mortgage_max_percentage DECIMAL(5,4),
  mortgage_max_uf DECIMAL(14,2),
  pie_percentage DECIMAL(5,4),
  pie_uf DECIMAL(14,2),
  pie_clp DECIMAL(14,2),

  -- Plan de pagos
  installments_plan1 INT,
  monthly_payment_plan1 DECIMAL(14,2),
  installments_plan2 INT,
  monthly_payment_plan2 DECIMAL(14,2),

  -- Rentabilidad
  rent_estimate DECIMAL(14,2),
  mortgage_payment DECIMAL(14,2),
  cash_flow DECIMAL(14,2),
  min_income DECIMAL(14,2),

  -- Reserva
  reserved_by UUID REFERENCES seller_profiles(id),
  reserved_at TIMESTAMPTZ,
  reservation_id UUID,

  -- Datos originales
  raw_data JSONB NOT NULL,
  extra_fields JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_project ON units(project_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_available ON units(project_id, status)
  WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_typology ON units(typology)
  WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_price ON units(final_price)
  WHERE status IN ('available', 'sin_abono');
CREATE INDEX idx_units_reserved_by ON units(reserved_by)
  WHERE reserved_by IS NOT NULL;

-- ============================================================
-- 5. VALOR UF
-- ============================================================

CREATE TABLE uf_values (
  date DATE PRIMARY KEY,
  value DECIMAL(12,2) NOT NULL
);

-- ============================================================
-- 6. SUSCRIPCIONES Y CRÉDITOS
-- ============================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  monthly_reservations_included INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seller_accounts (
  seller_id UUID PRIMARY KEY REFERENCES seller_profiles(id) ON DELETE CASCADE,
  available_credits INT NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  plan_reservations_remaining INT NOT NULL DEFAULT 3,
  total_credits_purchased INT NOT NULL DEFAULT 0,
  total_credits_used INT NOT NULL DEFAULT 0,
  lifetime_lead_reservations INT NOT NULL DEFAULT 0,
  lifetime_unit_reservations INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  credits_amount INT NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. LEADS — Info parcial pública, contacto oculto hasta reservar
-- ============================================================

CREATE TYPE lead_status AS ENUM (
  'available',     -- En la tabla para todos (sin datos de contacto)
  'reserved',      -- Reservado exclusivamente por un vendedor
  'contacted',     -- Vendedor hizo primer contacto
  'meeting_set',   -- Agendamiento creado
  'in_progress',   -- Negociación activa
  'converted',     -- Se cerró venta
  'lost',          -- No se concretó
  'released'       -- Liberado, vuelve a available
);

CREATE TYPE lead_quality AS ENUM ('cold', 'warm', 'hot', 'premium');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,

  -- === INFO VISIBLE PARA TODOS (tabla TanStack) ===
  quality_tier lead_quality NOT NULL DEFAULT 'cold',
  score INT DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  age INT,
  age_range TEXT,
  occupation TEXT,
  estimated_income INT,
  estimated_income_range TEXT,
  current_commune TEXT,
  family_size INT,
  preferred_typology TEXT,
  budget_min DECIMAL(14,2),
  budget_max DECIMAL(14,2),
  preferred_communes TEXT[],

  -- === INFO OCULTA (solo visible después de reservar) ===
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rut TEXT,
  additional_contact_info JSONB,

  -- === ESTADO Y RESERVA ===
  status lead_status NOT NULL DEFAULT 'available',
  reserved_by UUID REFERENCES seller_profiles(id),
  reserved_at TIMESTAMPTZ,

  -- Fuente y costo
  source TEXT,
  source_campaign TEXT,
  acquisition_cost DECIMAL(10,2),

  -- Metadata extensible
  metadata JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para TanStack Table (filtros principales)
CREATE INDEX idx_leads_available ON leads(status, score DESC)
  WHERE status = 'available';
CREATE INDEX idx_leads_age ON leads(age) WHERE status = 'available';
CREATE INDEX idx_leads_income ON leads(estimated_income) WHERE status = 'available';
CREATE INDEX idx_leads_occupation ON leads(occupation) WHERE status = 'available';
CREATE INDEX idx_leads_score ON leads(score DESC) WHERE status = 'available';
CREATE INDEX idx_leads_reserved_by ON leads(reserved_by)
  WHERE reserved_by IS NOT NULL;
CREATE INDEX idx_leads_metadata ON leads USING gin(metadata);

-- Vista que oculta datos de contacto para leads no reservados por el usuario
CREATE OR REPLACE VIEW leads_browsable AS
SELECT
  id, quality_tier, score, age, age_range, occupation,
  estimated_income, estimated_income_range, current_commune,
  family_size, preferred_typology, budget_min, budget_max,
  preferred_communes, status, metadata, created_at,
  -- Contacto: solo si este vendedor reservó el lead
  CASE WHEN reserved_by = auth.uid() THEN full_name ELSE NULL END AS full_name,
  CASE WHEN reserved_by = auth.uid() THEN email ELSE NULL END AS email,
  CASE WHEN reserved_by = auth.uid() THEN phone ELSE NULL END AS phone,
  CASE WHEN reserved_by = auth.uid() THEN rut ELSE NULL END AS rut
FROM leads
WHERE status = 'available' OR reserved_by = auth.uid();

-- ============================================================
-- 8. AGENDAMIENTOS (Reuniones — solo sobre leads reservados)
-- ============================================================

CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'completed',
  'no_show', 'cancelled', 'rescheduled'
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id UUID NOT NULL REFERENCES leads(id),

  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  location TEXT,
  meeting_type TEXT,

  -- Calendario externo
  external_calendar_event_id TEXT,
  cal_com_booking_id TEXT,
  calendar_provider TEXT,

  -- Estado y resultado
  status appointment_status NOT NULL DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  outcome_notes TEXT,
  outcome TEXT,  -- 'interested', 'not_interested', 'needs_followup', 'ready_to_reserve'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_seller ON appointments(seller_id, scheduled_at);
CREATE INDEX idx_appointments_lead ON appointments(lead_id);

-- ============================================================
-- 9. RESERVACIONES DE UNIDADES (post-agendamiento exitoso)
-- ============================================================

CREATE TYPE reservation_status AS ENUM (
  'active', 'in_progress', 'sold', 'cancelled', 'released'
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id UUID REFERENCES leads(id),
  appointment_id UUID REFERENCES appointments(id),

  status reservation_status NOT NULL DEFAULT 'active',

  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  sold_at TIMESTAMPTZ,
  sale_price DECIMAL(14,2),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Una unidad solo puede tener UNA reserva activa
  CONSTRAINT unique_active_unit_reservation
    EXCLUDE USING btree (unit_id WITH =)
    WHERE (status IN ('active', 'in_progress'))
);

CREATE INDEX idx_reservations_seller ON reservations(seller_id, status);
CREATE INDEX idx_reservations_unit ON reservations(unit_id);

-- ============================================================
-- 10. NOTAS / TIMELINE
-- ============================================================

CREATE TYPE note_type AS ENUM ('note', 'call', 'email', 'meeting', 'status_change', 'file_upload');

CREATE TABLE reservation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  type note_type NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ARCHIVOS
-- ============================================================

CREATE TABLE reservation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. IMPORTACIONES
-- ============================================================

CREATE TABLE stock_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  company_id UUID REFERENCES real_estate_companies(id),
  sheets_imported TEXT[],
  units_imported INT,
  units_skipped INT,
  column_mapping JSONB,
  errors JSONB,
  imported_by UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. AUDITORÍA
-- ============================================================

CREATE TABLE transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id UUID REFERENCES leads(id),
  unit_id UUID REFERENCES units(id),
  reservation_id UUID REFERENCES reservations(id),
  type TEXT NOT NULL,  -- 'lead_reservation', 'unit_reservation', 'credit_purchase', etc.
  credits INT,
  amount_money DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_seller ON transaction_log(seller_id, created_at DESC);

-- ============================================================
-- 14. ALTER: FK circular units ↔ reservations
--     (units.reservation_id → reservations.id)
--     No se puede crear en units porque reservations no existe aún
-- ============================================================

ALTER TABLE units
  ADD CONSTRAINT fk_units_reservation
  FOREIGN KEY (reservation_id) REFERENCES reservations(id);

-- ============================================================
-- 15. FUNCIONES, VIEWS, RLS, CRON
-- ============================================================

-- FUNCIÓN: RESERVAR LEAD (exclusivo, cobra créditos)

CREATE OR REPLACE FUNCTION reserve_lead(
  p_lead_id UUID,
  p_seller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_seller RECORD;
  v_credit_cost INT;
BEGIN
  -- 1. Bloquear fila del lead
  SELECT * INTO v_lead FROM leads
  WHERE id = p_lead_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_NOT_FOUND');
  END IF;

  IF v_lead.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_ALREADY_RESERVED');
  END IF;

  -- 2. Verificar cuenta del vendedor
  SELECT * INTO v_seller FROM seller_accounts
  WHERE seller_id = p_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_NOT_FOUND');
  END IF;

  v_credit_cost := CASE v_lead.quality_tier
    WHEN 'premium' THEN 4
    WHEN 'hot' THEN 3
    WHEN 'warm' THEN 2
    ELSE 1
  END;

  -- 3. Cobrar: primero plan, luego créditos
  IF v_seller.plan_reservations_remaining > 0 THEN
    UPDATE seller_accounts
    SET plan_reservations_remaining = plan_reservations_remaining - 1
    WHERE seller_id = p_seller_id;
    v_credit_cost := 0;
  ELSIF v_seller.available_credits >= v_credit_cost THEN
    UPDATE seller_accounts
    SET available_credits = available_credits - v_credit_cost,
        total_credits_used = total_credits_used + v_credit_cost
    WHERE seller_id = p_seller_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS',
      'required', v_credit_cost, 'available', v_seller.available_credits);
  END IF;

  -- 4. Reservar lead
  UPDATE leads
  SET status = 'reserved', reserved_by = p_seller_id, reserved_at = NOW()
  WHERE id = p_lead_id;

  -- 5. Actualizar stats
  UPDATE seller_accounts
  SET lifetime_lead_reservations = lifetime_lead_reservations + 1
  WHERE seller_id = p_seller_id;

  -- 6. Log
  INSERT INTO transaction_log (seller_id, lead_id, type, credits, created_at)
  VALUES (p_seller_id, p_lead_id, 'lead_reservation', -v_credit_cost, NOW());

  -- 7. Retornar con datos de contacto revelados
  RETURN jsonb_build_object(
    'success', true,
    'credits_used', v_credit_cost,
    'lead', jsonb_build_object(
      'id', v_lead.id,
      'full_name', v_lead.full_name,
      'email', v_lead.email,
      'phone', v_lead.phone,
      'rut', v_lead.rut,
      'score', v_lead.score,
      'quality_tier', v_lead.quality_tier
    )
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAD_BEING_PROCESSED');
END;
$$;

-- ============================================================
-- FUNCIÓN: RESERVAR UNIDAD (exclusivo, NO cobra créditos)
-- ============================================================

CREATE OR REPLACE FUNCTION reserve_unit(
  p_unit_id UUID,
  p_seller_id UUID,
  p_lead_id UUID DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit RECORD;
  v_reservation_id UUID;
BEGIN
  -- 1. Bloquear fila de la unidad
  SELECT u.*, p.name as project_name, p.commune, c.name as company_name
  INTO v_unit
  FROM units u
  JOIN projects p ON u.project_id = p.id
  JOIN real_estate_companies c ON p.company_id = c.id
  WHERE u.id = p_unit_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_NOT_FOUND');
  END IF;

  -- 2. Verificar disponibilidad
  IF v_unit.status NOT IN ('available', 'sin_abono', 'released') THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_NOT_AVAILABLE',
      'current_status', v_unit.status);
  END IF;

  -- 3. Si se pasa un lead_id, verificar que el vendedor lo tiene reservado
  IF p_lead_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM leads
      WHERE id = p_lead_id AND reserved_by = p_seller_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'LEAD_NOT_RESERVED_BY_YOU');
    END IF;
  END IF;

  -- 4. Crear reservación (sin cobro de créditos)
  INSERT INTO reservations (unit_id, seller_id, lead_id, appointment_id, status, reserved_at)
  VALUES (p_unit_id, p_seller_id, p_lead_id, p_appointment_id, 'active', NOW())
  RETURNING id INTO v_reservation_id;

  -- 5. Marcar unidad
  UPDATE units
  SET status = 'reserved',
      reserved_by = p_seller_id,
      reserved_at = NOW(),
      reservation_id = v_reservation_id
  WHERE id = p_unit_id;

  -- 6. Si hay lead, actualizar su status
  IF p_lead_id IS NOT NULL THEN
    UPDATE leads SET status = 'in_progress' WHERE id = p_lead_id;
  END IF;

  -- 7. Stats y log
  UPDATE seller_accounts
  SET lifetime_unit_reservations = lifetime_unit_reservations + 1
  WHERE seller_id = p_seller_id;

  INSERT INTO transaction_log (seller_id, unit_id, reservation_id, lead_id, type, created_at)
  VALUES (p_seller_id, p_unit_id, v_reservation_id, p_lead_id, 'unit_reservation', NOW());

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'unit', jsonb_build_object(
      'id', v_unit.id,
      'unit_number', v_unit.unit_number,
      'project', v_unit.project_name,
      'commune', v_unit.commune,
      'company', v_unit.company_name,
      'final_price', v_unit.final_price,
      'typology', v_unit.typology
    )
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_BEING_PROCESSED');
  WHEN exclusion_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNIT_ALREADY_RESERVED');
END;
$$;

-- ============================================================
-- FUNCIÓN: LIBERAR LEAD (vuelve al pool)
-- ============================================================

CREATE OR REPLACE FUNCTION release_lead(
  p_lead_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
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

  -- No se puede liberar si hay una unidad reservada para este lead
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE lead_id = p_lead_id AND status IN ('active', 'in_progress')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'HAS_ACTIVE_UNIT_RESERVATION',
      'message', 'Libere primero la reserva de unidad antes de liberar el lead');
  END IF;

  UPDATE leads
  SET status = 'released', reserved_by = NULL, reserved_at = NULL
  WHERE id = p_lead_id;

  -- Nota: NO se devuelven créditos (ya accedió a la info)
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- FUNCIÓN: LIBERAR UNIDAD
-- ============================================================

CREATE OR REPLACE FUNCTION release_unit(
  p_reservation_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
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
  SET status = 'released', released_at = NOW(), cancel_reason = p_reason
  WHERE id = p_reservation_id;

  UPDATE units
  SET status = 'released', reserved_by = NULL, reserved_at = NULL, reservation_id = NULL
  WHERE id = v_reservation.unit_id;

  RETURN jsonb_build_object('success', true, 'unit_id', v_reservation.unit_id);
END;
$$;

-- ============================================================
-- FUNCIÓN: MARCAR VENDIDA
-- ============================================================

CREATE OR REPLACE FUNCTION mark_unit_sold(
  p_reservation_id UUID,
  p_seller_id UUID,
  p_sale_price DECIMAL DEFAULT NULL
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
  SET status = 'sold', sold_at = NOW(), sale_price = p_sale_price
  WHERE id = p_reservation_id;

  UPDATE units SET status = 'sold' WHERE id = v_reservation.unit_id;

  -- Marcar lead como convertido si existe
  IF v_reservation.lead_id IS NOT NULL THEN
    UPDATE leads SET status = 'converted' WHERE id = v_reservation.lead_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- RESET MENSUAL
-- ============================================================

CREATE OR REPLACE FUNCTION reset_monthly_plan_reservations()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE seller_accounts sa
  SET plan_reservations_remaining = s.monthly_reservations_included
  FROM subscriptions s
  WHERE s.seller_id = sa.seller_id AND s.status = 'active';
END;
$$;

SELECT cron.schedule('reset-plan-reservations', '0 0 1 * *', 'SELECT reset_monthly_plan_reservations()');

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON seller_profiles
  FOR ALL USING (id = auth.uid());

-- Leads: ver disponibles (sin contacto) + ver mis reservados (con contacto)
CREATE POLICY "browse_and_own_leads" ON leads
  FOR SELECT USING (status = 'available' OR reserved_by = auth.uid());

-- Solo el sistema puede UPDATE leads (via funciones SECURITY DEFINER)
-- No se necesita policy de UPDATE para vendedores

CREATE POLICY "own_appointments" ON appointments
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "own_reservations" ON reservations
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "own_notes" ON reservation_notes
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "own_files" ON reservation_files
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "own_account" ON seller_accounts
  FOR ALL USING (seller_id = auth.uid());

-- Stock: todos leen
CREATE POLICY "read_companies" ON real_estate_companies
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "read_projects" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "read_units" ON units
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 5. Frontend: Leads con TanStack Table

### Columnas

```typescript
const columns: ColumnDef<Lead>[] = [
  // Info pública (siempre visible)
  { accessorKey: 'score',             header: 'Score',
    cell: ({ getValue }) => <ScoreBadge score={getValue()} /> },
  { accessorKey: 'age',               header: 'Edad' },
  { accessorKey: 'occupation',        header: 'Ocupación' },
  { accessorKey: 'estimated_income',  header: 'Renta',
    cell: ({ getValue }) => formatCLP(getValue()) },
  { accessorKey: 'current_commune',   header: 'Comuna' },
  { accessorKey: 'preferred_typology', header: 'Preferencia' },
  { accessorKey: 'budget_min',        header: 'Presupuesto',
    cell: ({ row }) => `${formatUF(row.original.budget_min)}-${formatUF(row.original.budget_max)}` },

  // Datos de contacto (null hasta reservar, luego visibles)
  { accessorKey: 'full_name',  header: 'Nombre',
    cell: ({ getValue }) => getValue() ?? '🔒' },
  { accessorKey: 'phone',     header: 'Teléfono',
    cell: ({ getValue }) => getValue() ?? '🔒' },

  // Acción
  { id: 'actions', header: '',
    cell: ({ row }) => row.original.full_name
      ? <AgendarButton lead={row.original} />
      : <ReservarLeadButton leadId={row.original.id} /> },
];
```

### Filtros Principales

| Filtro | Tipo |
|--------|------|
| Score | Range slider (0-100) |
| Edad | Range slider |
| Ocupación | Multi-select / search |
| Renta | Range slider |

### Realtime: Leads Desaparecen al ser Reservados

Cuando un vendedor reserva un lead, este debe desaparecer **inmediatamente** de la tabla de todos los demás vendedores. Se implementa con dos mecanismos complementarios:

**Mecanismo 1 — Supabase Realtime (proactivo)**

Todos los clientes se suscriben a cambios en la tabla `leads`. Cuando un lead cambia de `available` a `reserved`, el cliente lo elimina del state local de TanStack Table sin necesidad de refrescar.

```typescript
// hooks/useLeadsRealtime.ts
useEffect(() => {
  const channel = supabase
    .channel('leads-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leads',
        filter: 'status=eq.reserved',
      },
      (payload) => {
        const reservedLeadId = payload.new.id;
        const reservedBy = payload.new.reserved_by;

        if (reservedBy === currentUserId) {
          // Yo lo reservé: actualizar la fila con datos de contacto
          updateLeadInTable(payload.new);
        } else {
          // Otro lo reservó: eliminar de MI tabla con animación
          removeLeadFromTable(reservedLeadId);
          // Opcional: toast sutil "1 lead fue reservado por otro vendedor"
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

**Mecanismo 2 — Validación en `reserve_lead()` (reactivo / stale UI)**

Si el Realtime no llega a tiempo (latencia, pestaña inactiva, conexión intermitente) y un vendedor hace click en "Reservar" sobre un lead que ya fue adquirido por otro:

1. `reserve_lead()` detecta `status != 'available'` → retorna `LEAD_ALREADY_RESERVED`
2. El frontend muestra una alerta clara
3. El lead se elimina de la tabla local

```typescript
// Ejemplo de handler en el frontend
async function handleReserveLead(leadId: string) {
  const { data, error } = await supabase.rpc('reserve_lead', {
    p_lead_id: leadId,
    p_seller_id: currentUserId,
  });

  if (data?.error === 'LEAD_ALREADY_RESERVED') {
    // 1. Alerta al vendedor
    toast.error('Este lead ya fue adquirido por otro vendedor');
    // 2. Eliminar de la tabla inmediatamente
    removeLeadFromTable(leadId);
    return;
  }

  if (data?.error === 'LEAD_BEING_PROCESSED') {
    toast.warning('Otro vendedor está reservando este lead. Intente de nuevo.');
    return;
  }

  if (data?.error === 'INSUFFICIENT_CREDITS') {
    toast.error(
      `Créditos insuficientes. Necesitas ${data.required}, tienes ${data.available}.`
    );
    return;
  }

  if (data?.success) {
    // Lead reservado exitosamente: actualizar tabla con datos de contacto
    toast.success(`Lead reservado: ${data.lead.full_name}`);
    updateLeadInTable({ ...data.lead, status: 'reserved' });
  }
}
```

**Flujo visual para el vendedor:**

```
Vendedor A y Vendedor B ven el mismo lead en sus tablas
    │
    ├─ Vendedor A clickea "Reservar" → reserve_lead() → éxito
    │   → Vendedor A ve datos de contacto revelados
    │   → Supabase Realtime dispara evento UPDATE
    │
    ├─ Vendedor B recibe evento Realtime (caso normal)
    │   → Lead desaparece de su tabla con animación fade-out
    │   → No necesita hacer nada
    │
    └─ Vendedor B NO recibió Realtime (caso stale UI)
        → Clickea "Reservar" sobre el lead ya adquirido
        → reserve_lead() retorna LEAD_ALREADY_RESERVED
        → Alerta: "Este lead ya fue adquirido por otro vendedor"
        → Lead se elimina de su tabla
```

Este mismo patrón aplica para la reserva de unidades del stock: Realtime proactivo + validación reactiva en `reserve_unit()`.

---

## 6. Plan de Implementación

### Fase 1: Stock (Semanas 1-2)

- Auth + perfiles
- Schema: companies, projects, units
- Importador de Excel con column mappings
- Vista de stock con filtros

### Fase 2: Leads (Semana 3)

- Schema: leads con exclusividad
- Importador de leads (CSV)
- TanStack Table con filtros (edad, ocupación, renta, score)
- Función `reserve_lead()` con créditos
- View `leads_browsable` (contacto oculto)
- Realtime: leads reservados desaparecen

### Fase 3: Agendamientos (Semanas 4-5)

- Schema: appointments
- Cal.com embedded
- Solo sobre leads reservados por el vendedor

### Fase 4: Reserva de Unidades (Semanas 5-6)

- Función `reserve_unit()`
- Asociar lead + unidad
- Pipeline (active → in_progress → sold/released)
- Realtime en stock

### Fase 5: CRM + Monetización (Semanas 7-10)

- Notas, archivos, dashboard
- Stripe (suscripciones + créditos)
- Billing

---

## 7. Diagrama: Flujo Completo

```
  ┌──────────────────────────────────────────┐
  │         TABLA DE LEADS (TanStack)        │
  │  score | edad | ocupación | renta | 🔒🔒  │
  │  Filtrar → Encontrar lead prometedor     │
  └─────────────────┬────────────────────────┘
                    │
                    ▼ [Paga crédito / usa cupo del plan]
  ┌──────────────────────────────────────────┐
  │         RESERVAR LEAD (exclusivo)        │
  │  → Se revelan datos de contacto          │
  │  → Lead desaparece para otros            │
  │  → FOR UPDATE NOWAIT                     │
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │         AGENDAMIENTO (reunión)           │
  │  → Cal.com: agendar con el lead          │
  │  → Sync Google/Outlook                   │
  └─────────────────┬────────────────────────┘
                    │
                    ▼ [Reunión exitosa]
  ┌──────────────────────────────────────────┐
  │      RESERVAR UNIDAD (exclusivo)         │
  │  → Seleccionar unidad del stock          │
  │  → Unidad desaparece del stock           │
  │  → FOR UPDATE NOWAIT (sin costo extra)   │
  │  → Asociar: lead + unidad + vendedor     │
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │           GESTIÓN / CRM                  │
  │  → Notas, archivos, pipeline             │
  │  → Marcar vendida O liberar              │
  └──────────────────────────────────────────┘
```

---

## Resumen Ejecutivo

| Decisión | Recomendación |
|----------|---------------|
| **Leads** | Tabla TanStack, info parcial pública. Filtros: edad, ocupación, renta, score. |
| **Reserva de lead** | Exclusiva, indefinida. Cobra créditos/plan. Revela contacto. `FOR UPDATE NOWAIT`. |
| **Agendamiento** | Reunión vendedor↔lead. Solo sobre leads reservados. Cal.com embedded. |
| **Reserva de unidad** | Exclusiva, indefinida. Sin costo adicional. `FOR UPDATE NOWAIT`. |
| **Monetización** | Créditos se cobran al reservar lead (no la unidad). |
| **Stock MVP** | Data estática. Columnas normalizadas + raw_data JSONB. |
| **Stack** | Next.js + Supabase Pro |