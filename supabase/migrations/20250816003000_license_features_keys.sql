-- Add plan_name and feature_key columns
ALTER TABLE license_features
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS feature_key text;

-- Enforce NOT NULL constraints
ALTER TABLE license_features
  ALTER COLUMN plan_name SET NOT NULL,
  ALTER COLUMN feature_key SET NOT NULL;

-- Update unique constraint
ALTER TABLE license_features DROP CONSTRAINT IF EXISTS license_features_tenant_id_license_id_feature_key;
ALTER TABLE license_features ADD CONSTRAINT license_features_tenant_plan_feature_key UNIQUE (tenant_id, plan_name, feature_key);

-- Seed a full license and all features for existing tenants
INSERT INTO licenses (tenant_id, plan_name, tier, status, starts_at, created_by, updated_by)
SELECT t.id, 'full', 'enterprise', 'active', CURRENT_DATE, t.created_by, t.created_by
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM licenses l WHERE l.tenant_id = t.id AND l.plan_name = 'full'
);

INSERT INTO license_features (tenant_id, license_id, feature, plan_name, feature_key, created_by, updated_by)
SELECT l.tenant_id, l.id, mi.feature_key, l.plan_name, mi.feature_key, l.created_by, l.created_by
FROM licenses l
JOIN menu_items mi ON mi.tenant_id IS NULL
WHERE l.plan_name = 'full'
ON CONFLICT (tenant_id, plan_name, feature_key) DO NOTHING;
