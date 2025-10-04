-- Surface license bindings extension for licensing-RBAC integration
-- Extends rbac_surface_bindings and metadata_surfaces with explicit license requirements

BEGIN;

-- Add license-related columns to metadata_surfaces table
ALTER TABLE metadata_surfaces
  ADD COLUMN IF NOT EXISTS required_license_bundle_id uuid REFERENCES license_feature_bundles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS required_features text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license_tier_min text CHECK (license_tier_min IN ('starter', 'professional', 'enterprise', 'custom', null));

-- Add license-related columns to rbac_surface_bindings table
ALTER TABLE rbac_surface_bindings
  ADD COLUMN IF NOT EXISTS required_license_bundle_id uuid REFERENCES license_feature_bundles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enforces_license boolean DEFAULT false;

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS metadata_surfaces_required_license_bundle_idx
  ON metadata_surfaces(required_license_bundle_id)
  WHERE required_license_bundle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rbac_surface_bindings_required_license_bundle_idx
  ON rbac_surface_bindings(required_license_bundle_id)
  WHERE required_license_bundle_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN metadata_surfaces.required_license_bundle_id IS 'Optional license feature bundle required to access this surface.';
COMMENT ON COLUMN metadata_surfaces.required_features IS 'Array of feature codes required from the feature catalog to access this surface.';
COMMENT ON COLUMN metadata_surfaces.license_tier_min IS 'Minimum product tier required to access this surface (starter, professional, enterprise).';
COMMENT ON COLUMN rbac_surface_bindings.required_license_bundle_id IS 'Optional license bundle that must be granted to the tenant for this binding to be effective.';
COMMENT ON COLUMN rbac_surface_bindings.enforces_license IS 'Whether this binding should enforce license checks in addition to RBAC checks.';

-- Create a view that shows effective surface access combining RBAC and licensing
CREATE OR REPLACE VIEW v_effective_surface_access AS
SELECT DISTINCT
  rsb.tenant_id,
  rsb.role_id,
  rsb.bundle_id,
  rsb.menu_item_id,
  rsb.metadata_blueprint_id,
  ms.id AS surface_id,
  ms.title AS surface_title,
  ms.route AS surface_route,
  ms.feature_code AS surface_feature_code,
  rsb.required_license_bundle_id,
  rsb.enforces_license,
  ms.required_license_bundle_id AS surface_required_bundle_id,
  ms.required_features AS surface_required_features,
  ms.license_tier_min,
  -- Check if tenant has required features
  CASE
    WHEN ms.required_features IS NOT NULL AND array_length(ms.required_features, 1) > 0 THEN
      EXISTS (
        SELECT 1
        FROM unnest(ms.required_features) AS req_feature
        WHERE EXISTS (
          SELECT 1
          FROM active_tenant_feature_codes atfc
          WHERE atfc.tenant_id = rsb.tenant_id
            AND atfc.feature_code = req_feature
        )
      )
    ELSE true
  END AS has_required_features,
  -- Check if tenant has required bundle
  CASE
    WHEN rsb.required_license_bundle_id IS NOT NULL OR ms.required_license_bundle_id IS NOT NULL THEN
      EXISTS (
        SELECT 1
        FROM license_feature_bundle_items lfbi
        JOIN tenant_feature_grants tfg ON tfg.feature_id = lfbi.feature_id AND tfg.tenant_id = rsb.tenant_id
        WHERE lfbi.bundle_id = COALESCE(rsb.required_license_bundle_id, ms.required_license_bundle_id)
          AND (tfg.starts_at IS NULL OR tfg.starts_at <= CURRENT_DATE)
          AND (tfg.expires_at IS NULL OR tfg.expires_at >= CURRENT_DATE)
      )
    ELSE true
  END AS has_required_bundle
FROM rbac_surface_bindings rsb
LEFT JOIN metadata_surfaces ms ON ms.id = rsb.metadata_blueprint_id
WHERE rsb.is_active = true;

-- Create function to check if a user can access a surface (combines RBAC + licensing)
CREATE OR REPLACE FUNCTION can_access_surface(
  p_user_id uuid,
  p_tenant_id uuid,
  p_surface_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_has_rbac_access boolean;
  v_has_license_access boolean;
  v_enforces_license boolean;
BEGIN
  -- Check RBAC access through role assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN rbac_surface_bindings rsb ON rsb.role_id = ur.role_id AND rsb.tenant_id = ur.tenant_id
    WHERE ur.user_id = p_user_id
      AND ur.tenant_id = p_tenant_id
      AND rsb.metadata_blueprint_id = p_surface_id
      AND rsb.is_active = true
  ) INTO v_has_rbac_access;

  -- Check if license enforcement is required
  SELECT
    COALESCE(MAX(rsb.enforces_license::int), 0)::boolean OR
    EXISTS (
      SELECT 1 FROM metadata_surfaces ms
      WHERE ms.id = p_surface_id
        AND (ms.required_license_bundle_id IS NOT NULL
             OR ms.required_features IS NOT NULL
             OR ms.license_tier_min IS NOT NULL)
    )
  INTO v_enforces_license
  FROM rbac_surface_bindings rsb
  WHERE rsb.metadata_blueprint_id = p_surface_id
    AND rsb.tenant_id = p_tenant_id;

  -- If license is not enforced, return RBAC result
  IF NOT v_enforces_license THEN
    RETURN v_has_rbac_access;
  END IF;

  -- Check license access
  SELECT EXISTS (
    SELECT 1
    FROM v_effective_surface_access vesa
    WHERE vesa.tenant_id = p_tenant_id
      AND vesa.surface_id = p_surface_id
      AND vesa.has_required_features = true
      AND vesa.has_required_bundle = true
  ) INTO v_has_license_access;

  -- Return true only if both RBAC and license checks pass
  RETURN v_has_rbac_access AND v_has_license_access;
END;
$$;

-- Update some metadata surfaces to require specific bundles (examples)
UPDATE metadata_surfaces
SET
  required_license_bundle_id = (SELECT id FROM license_feature_bundles WHERE code = 'rbac-security'),
  license_tier_min = 'professional'
WHERE id IN (
  'admin-security/rbac-dashboard',
  'admin-security/role-bundle-explorer',
  'admin-security/permission-bundle-composer',
  'admin-security/surface-binding-manager'
);

UPDATE metadata_surfaces
SET
  required_license_bundle_id = (SELECT id FROM license_feature_bundles WHERE code = 'multi-campus'),
  license_tier_min = 'enterprise'
WHERE id IN (
  'admin-security/delegated-access-console'
);

UPDATE metadata_surfaces
SET
  required_license_bundle_id = (SELECT id FROM license_feature_bundles WHERE code = 'financial-management'),
  license_tier_min = 'starter'
WHERE module = 'finance';

UPDATE metadata_surfaces
SET
  required_license_bundle_id = (SELECT id FROM license_feature_bundles WHERE code = 'member-management'),
  license_tier_min = 'starter'
WHERE module = 'members';

-- Grant execute permissions
GRANT SELECT ON v_effective_surface_access TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_surface(uuid, uuid, text) TO authenticated;

COMMIT;
