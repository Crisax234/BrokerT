-- Add meeting_at to leads table
ALTER TABLE leads ADD COLUMN meeting_at TIMESTAMPTZ;

-- Must drop and recreate view since column order changes
DROP VIEW IF EXISTS leads_browsable;

CREATE VIEW leads_browsable AS
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
  meeting_at,
  CASE WHEN reserved_by = auth.uid() THEN full_name ELSE NULL END AS full_name,
  CASE WHEN reserved_by = auth.uid() THEN email     ELSE NULL END AS email,
  CASE WHEN reserved_by = auth.uid() THEN phone     ELSE NULL END AS phone,
  CASE WHEN reserved_by = auth.uid() THEN rut       ELSE NULL END AS rut
FROM leads
WHERE status = 'available' OR reserved_by = auth.uid();

-- Re-grant permissions on recreated view
GRANT SELECT ON leads_browsable TO anon, authenticated;
GRANT ALL    ON leads_browsable TO service_role;
