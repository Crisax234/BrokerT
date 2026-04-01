-- ============================================================
-- Saved Escenarios
-- Stores escenario inputs + results snapshot per lead/project
-- so sellers can reopen, edit, and use data in client tables.
-- ============================================================

CREATE TABLE saved_escenarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES seller_profiles(id),
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  project_id  UUID NOT NULL REFERENCES projects(id),
  unit_ids    UUID[] NOT NULL DEFAULT '{}',
  inputs      JSONB NOT NULL DEFAULT '{}',
  results     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by lead (table view fetches latest per lead)
CREATE INDEX idx_saved_escenarios_lead ON saved_escenarios (lead_id, created_at DESC);
CREATE INDEX idx_saved_escenarios_seller ON saved_escenarios (seller_id);

-- RLS
ALTER TABLE saved_escenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_escenarios" ON saved_escenarios
  AS PERMISSIVE FOR ALL TO authenticated USING (seller_id = auth.uid());

-- Grants (same pattern as reservations)
GRANT SELECT, INSERT, UPDATE ON saved_escenarios TO authenticated;
