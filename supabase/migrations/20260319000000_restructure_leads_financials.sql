-- ============================================================
-- Restructure leads: replace budget/typology with financial columns
-- Migration: 20260319000000_restructure_leads_financials.sql
-- ============================================================

-- 1. Drop the view that depends on old columns
DROP VIEW IF EXISTS leads_browsable;

-- 2. Drop old index on estimated_income
DROP INDEX IF EXISTS idx_leads_income;

-- 3. Add new financial columns
ALTER TABLE leads
  ADD COLUMN liquidaciones          INT DEFAULT 0,
  ADD COLUMN honorarios             INT DEFAULT 0,
  ADD COLUMN arriendos              INT DEFAULT 0,
  ADD COLUMN retiros                INT DEFAULT 0,
  ADD COLUMN cuota_credito_consumo  INT DEFAULT 0,
  ADD COLUMN dividendo_actual       INT DEFAULT 0,
  ADD COLUMN bancarizado            BOOLEAN DEFAULT false,
  ADD COLUMN ahorros                BOOLEAN DEFAULT false;

-- 4. Drop old columns (keep occupation, current_commune)
ALTER TABLE leads
  DROP COLUMN IF EXISTS budget_min,
  DROP COLUMN IF EXISTS budget_max,
  DROP COLUMN IF EXISTS preferred_typology,
  DROP COLUMN IF EXISTS estimated_income,
  DROP COLUMN IF EXISTS estimated_income_range,
  DROP COLUMN IF EXISTS preferred_communes,
  DROP COLUMN IF EXISTS family_size,
  DROP COLUMN IF EXISTS age_range;

-- 5. Recreate leads_browsable VIEW with computed financial columns
CREATE OR REPLACE VIEW leads_browsable AS
SELECT
  id,
  quality_tier,
  score,
  age,
  occupation,
  current_commune,
  -- Financial: RENTA
  liquidaciones,
  honorarios,
  arriendos,
  retiros,
  (COALESCE(liquidaciones,0) + COALESCE(honorarios,0) + COALESCE(arriendos,0) + COALESCE(retiros,0)) AS renta_total,
  -- Financial: EGRESOS
  cuota_credito_consumo,
  dividendo_actual,
  (COALESCE(cuota_credito_consumo,0) + COALESCE(dividendo_actual,0)) AS egresos_total,
  -- MAX DIVIDENDO = GREATEST(0, 25% of renta_total - egresos_total)
  GREATEST(0,
    0.25 * (COALESCE(liquidaciones,0) + COALESCE(honorarios,0) + COALESCE(arriendos,0) + COALESCE(retiros,0))
    - (COALESCE(cuota_credito_consumo,0) + COALESCE(dividendo_actual,0))
  )::INT AS max_dividendo,
  -- Info personal
  bancarizado,
  ahorros,
  -- Existing columns
  status,
  metadata,
  created_at,
  meeting_at,
  reserved_by,
  reserved_at,
  -- Contact info: only revealed if this seller reserved the lead
  CASE WHEN reserved_by = auth.uid() THEN full_name ELSE NULL END AS full_name,
  CASE WHEN reserved_by = auth.uid() THEN email     ELSE NULL END AS email,
  CASE WHEN reserved_by = auth.uid() THEN phone     ELSE NULL END AS phone,
  CASE WHEN reserved_by = auth.uid() THEN rut       ELSE NULL END AS rut
FROM leads
WHERE status = 'available' OR reserved_by = auth.uid();

-- 6. New indexes
CREATE INDEX idx_leads_bancarizado ON leads(bancarizado) WHERE status = 'available';
CREATE INDEX idx_leads_ahorros     ON leads(ahorros)     WHERE status = 'available';

-- 7. Re-grant permissions on view
GRANT SELECT ON leads_browsable TO anon, authenticated;
GRANT ALL    ON leads_browsable TO service_role;
