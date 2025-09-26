-- RBAC metadata surface and license entitlement overhaul
-- Implements metadata-first RBAC UI alignment and replaces legacy license tables.

BEGIN;

-- Drop dependent views and functions tied to legacy metadata_pages and licenses
-- Drop policies that depend on legacy functions
DROP POLICY IF EXISTS "Menu items are viewable within tenant" ON menu_items;
DROP POLICY IF EXISTS "Metadata pages are viewable within tenant" ON metadata_pages;

DROP VIEW IF EXISTS user_metadata_surface_access;
DROP VIEW IF EXISTS user_metadata_page_access;
DROP VIEW IF EXISTS user_menu_access;
DROP VIEW IF EXISTS active_tenant_license_features;

DROP FUNCTION IF EXISTS get_user_accessible_metadata_pages(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_licensed_metadata_pages(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_licensed_menu_items(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_menu_with_metadata(uuid, uuid);
DROP FUNCTION IF EXISTS can_access_metadata_page(text, uuid, uuid);
DROP FUNCTION IF EXISTS register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]);
DROP FUNCTION IF EXISTS rebuild_rbac_metadata_pages(uuid);
DROP FUNCTION IF EXISTS tenant_has_feature(text, uuid);
DROP FUNCTION IF EXISTS can_access_feature(text, uuid);

-- Prepare menu and surface binding tables for blueprint-based references
DROP INDEX IF EXISTS menu_items_metadata_page_id_idx;
ALTER TABLE menu_items
  RENAME COLUMN metadata_page_id TO metadata_blueprint_id;
CREATE INDEX IF NOT EXISTS menu_items_metadata_blueprint_id_idx
  ON menu_items(metadata_blueprint_id)
  WHERE metadata_blueprint_id IS NOT NULL;

DROP INDEX IF EXISTS rbac_surface_bindings_metadata_page_id_idx;
DROP INDEX IF EXISTS rbac_surface_bindings_role_unique_idx;
DROP INDEX IF EXISTS rbac_surface_bindings_bundle_unique_idx;
ALTER TABLE rbac_surface_bindings
  RENAME COLUMN metadata_page_id TO metadata_blueprint_id;

-- Recreate uniqueness and lookup indexes with the new column naming
CREATE UNIQUE INDEX rbac_surface_bindings_role_surface_unique_idx
  ON rbac_surface_bindings (
    tenant_id,
    role_id,
    COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metadata_blueprint_id, '')
  )
  WHERE role_id IS NOT NULL;

CREATE UNIQUE INDEX rbac_surface_bindings_bundle_surface_unique_idx
  ON rbac_surface_bindings (
    tenant_id,
    bundle_id,
    COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metadata_blueprint_id, '')
  )
  WHERE bundle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rbac_surface_bindings_metadata_blueprint_idx
  ON rbac_surface_bindings(metadata_blueprint_id)
  WHERE metadata_blueprint_id IS NOT NULL;

-- Metadata surfaces replace legacy metadata_pages registry
CREATE TABLE metadata_surfaces (
  id text PRIMARY KEY,
  module text NOT NULL,
  route text,
  blueprint_path text NOT NULL,
  surface_type text NOT NULL CHECK (surface_type IN (
    'page', 'dashboard', 'wizard', 'manager', 'console', 'audit', 'overlay'
  )),
  phase text NOT NULL DEFAULT 'foundation' CHECK (phase IN (
    'foundation', 'role-management', 'surface-binding', 'delegated', 'operations', 'legacy'
  )),
  title text,
  description text,
  feature_code text,
  rbac_role_keys text[],
  rbac_bundle_keys text[],
  default_menu_code text,
  supports_mobile boolean DEFAULT true,
  supports_desktop boolean DEFAULT true,
  is_system boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bring forward existing metadata page definitions where available
INSERT INTO metadata_surfaces (
  id,
  module,
  route,
  blueprint_path,
  surface_type,
  phase,
  title,
  description,
  feature_code,
  rbac_role_keys,
  rbac_bundle_keys,
  default_menu_code,
  supports_mobile,
  supports_desktop,
  is_system,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  id,
  module,
  route,
  id || '.xml' AS blueprint_path,
  'page' AS surface_type,
  'legacy' AS phase,
  title,
  description,
  feature_code,
  rbac_roles,
  rbac_bundles,
  NULL,
  true,
  true,
  is_system,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM metadata_pages
ON CONFLICT (id) DO NOTHING;

-- Ensure all referenced blueprint ids exist even if no legacy page was registered
INSERT INTO metadata_surfaces (
  id,
  module,
  blueprint_path,
  surface_type,
  phase,
  title,
  description
)
SELECT DISTINCT
  rsb.metadata_blueprint_id,
  split_part(rsb.metadata_blueprint_id, '/', 1),
  rsb.metadata_blueprint_id || '.xml',
  'page',
  'legacy',
  rsb.metadata_blueprint_id,
  'Backfilled from RBAC surface binding'
FROM rbac_surface_bindings rsb
LEFT JOIN metadata_surfaces ms ON ms.id = rsb.metadata_blueprint_id
WHERE rsb.metadata_blueprint_id IS NOT NULL
  AND ms.id IS NULL;

INSERT INTO metadata_surfaces (
  id,
  module,
  blueprint_path,
  surface_type,
  phase,
  title,
  description
)
SELECT DISTINCT
  mi.metadata_blueprint_id,
  split_part(mi.metadata_blueprint_id, '/', 1),
  mi.metadata_blueprint_id || '.xml',
  'page',
  'legacy',
  mi.metadata_blueprint_id,
  'Backfilled from menu metadata reference'
FROM menu_items mi
LEFT JOIN metadata_surfaces ms ON ms.id = mi.metadata_blueprint_id
WHERE mi.metadata_blueprint_id IS NOT NULL
  AND ms.id IS NULL;

-- Dedicated overlays table to track metadata overlay templates per persona
CREATE TABLE metadata_surface_overlays (
  id text PRIMARY KEY,
  surface_id text REFERENCES metadata_surfaces(id) ON DELETE CASCADE,
  persona text NOT NULL,
  overlay_path text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant', 'campus', 'global')),
  is_template boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed RBAC UI blueprint scaffolding per implementation plan
INSERT INTO metadata_surfaces (id, module, route, blueprint_path, surface_type, phase, title, description, feature_code, default_menu_code)
VALUES
  ('admin-security/rbac-dashboard', 'admin-security', '/admin/security/rbac', 'admin-security/rbac-dashboard.xml', 'dashboard', 'foundation', 'RBAC Command Center', 'Blueprint shell for RBAC overview aligning with metadata-first controls.', 'rbac.core', 'rbac_dashboard'),
  ('admin-security/role-bundle-explorer', 'admin-security', '/admin/security/rbac/roles', 'admin-security/role-bundle-explorer.xml', 'manager', 'role-management', 'Role & Bundle Explorer', 'Grid experience cataloging roles, bundles, and scope tags.', 'rbac.role.catalog', 'rbac_roles'),
  ('admin-security/permission-bundle-composer', 'admin-security', '/admin/security/rbac/bundles', 'admin-security/permission-bundle-composer.xml', 'wizard', 'role-management', 'Permission Bundle Composer', 'Guided wizard to assemble permission actions into bundles.', 'rbac.bundle.compose', 'rbac_bundles'),
  ('admin-security/surface-binding-manager', 'admin-security', '/admin/security/rbac/surfaces', 'admin-security/surface-binding-manager.xml', 'manager', 'surface-binding', 'Surface Binding Manager', 'Detail pane mapping menu items, overlays, and feature gates.', 'rbac.surface.manage', 'rbac_surfaces'),
  ('admin-security/delegated-access-console', 'admin-security', '/admin/security/rbac/delegation', 'admin-security/delegated-access-console.xml', 'console', 'delegated', 'Delegated Access Console', 'Scoped console for campus pastors and ministry leads.', 'rbac.delegated.console', 'rbac_delegation'),
  ('admin-security/rbac-audit-dashboard', 'admin-security', '/admin/security/rbac/audit', 'admin-security/rbac-audit-dashboard.xml', 'audit', 'operations', 'RBAC Audit & Publishing Dashboard', 'Operational dashboard surfacing audit trails and metadata publish status.', 'rbac.audit.ops', 'rbac_audit')
ON CONFLICT (id) DO UPDATE SET
  module = EXCLUDED.module,
  route = EXCLUDED.route,
  blueprint_path = EXCLUDED.blueprint_path,
  surface_type = EXCLUDED.surface_type,
  phase = EXCLUDED.phase,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  feature_code = EXCLUDED.feature_code,
  default_menu_code = EXCLUDED.default_menu_code,
  updated_at = now();

INSERT INTO metadata_surface_overlays (id, surface_id, persona, overlay_path, description, scope)
VALUES
  ('admin-security/permission-bundle-composer/small-church-template', 'admin-security/permission-bundle-composer', 'administrator', 'admin-security/overlays/permission-bundle-composer-small.xml', 'Small congregation template with simplified bundle guidance.', 'tenant'),
  ('admin-security/permission-bundle-composer/multi-site-template', 'admin-security/permission-bundle-composer', 'multi-site-director', 'admin-security/overlays/permission-bundle-composer-multisite.xml', 'Large campus overlay emphasizing delegated bundle scopes.', 'campus'),
  ('admin-security/delegated-access-console/campus-pastor', 'admin-security/delegated-access-console', 'campus-pastor', 'admin-security/overlays/delegated-console-campus.xml', 'Delegated console overlay scoped to campus pastors.', 'campus'),
  ('admin-security/rbac-audit-dashboard/operations', 'admin-security/rbac-audit-dashboard', 'operations-director', 'admin-security/overlays/rbac-audit-operations.xml', 'Operational overlay emphasizing refresh status and publishing queue.', 'tenant')
ON CONFLICT (id) DO UPDATE SET
  surface_id = EXCLUDED.surface_id,
  persona = EXCLUDED.persona,
  overlay_path = EXCLUDED.overlay_path,
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  updated_at = now();

-- Metadata surfaces govern blueprint access instead of metadata_pages
DROP TABLE IF EXISTS metadata_pages;

ALTER TABLE rbac_surface_bindings
  ADD CONSTRAINT rbac_surface_bindings_metadata_surface_fk
  FOREIGN KEY (metadata_blueprint_id)
  REFERENCES metadata_surfaces(id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE rbac_surface_bindings
  VALIDATE CONSTRAINT rbac_surface_bindings_metadata_surface_fk;

-- Replace legacy license tables with feature catalog + entitlements
CREATE TABLE feature_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'core',
  description text,
  phase text NOT NULL DEFAULT 'ga',
  is_delegatable boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE feature_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  cadence text NOT NULL DEFAULT 'monthly',
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE feature_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES feature_packages(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (package_id, feature_id)
);

CREATE TABLE tenant_feature_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  grant_source text NOT NULL CHECK (grant_source IN ('package', 'direct', 'trial', 'comp')), 
  package_id uuid REFERENCES feature_packages(id) ON DELETE SET NULL,
  source_reference text,
  starts_at date DEFAULT CURRENT_DATE,
  expires_at date,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX tenant_feature_grants_dedup_idx
  ON tenant_feature_grants (
    tenant_id,
    feature_id,
    grant_source,
    COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(source_reference, '')
  );

-- Migrate legacy license data where present into the new structures
INSERT INTO feature_catalog (code, name, category, description, phase)
SELECT DISTINCT
  lf.feature,
  initcap(replace(lf.feature, '_', ' ')),
  'legacy',
  'Migrated from legacy license_features record.',
  'legacy'
FROM license_features lf
ON CONFLICT (code) DO NOTHING;

INSERT INTO feature_packages (code, name, description, cadence, is_active)
SELECT DISTINCT
  COALESCE(NULLIF(btrim(l.plan_name), ''), 'legacy-package'),
  initcap(replace(COALESCE(NULLIF(btrim(l.plan_name), ''), 'legacy package'), '_', ' ')),
  CONCAT('Migrated legacy license tier ', l.tier),
  'legacy',
  l.status = 'active'
FROM licenses l
ON CONFLICT (code) DO NOTHING;

INSERT INTO feature_package_items (package_id, feature_id)
SELECT DISTINCT
  fp.id,
  fc.id
FROM license_features lf
JOIN licenses l ON l.id = lf.license_id
JOIN feature_packages fp ON fp.code = COALESCE(NULLIF(btrim(l.plan_name), ''), 'legacy-package')
JOIN feature_catalog fc ON fc.code = lf.feature
ON CONFLICT (package_id, feature_id) DO NOTHING;

INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, package_id, source_reference, starts_at, expires_at, created_at, updated_at)
SELECT DISTINCT
  l.tenant_id,
  fc.id,
  'package'::text,
  fp.id,
  l.id::text,
  l.starts_at,
  l.expires_at,
  now(),
  now()
FROM license_features lf
JOIN licenses l ON l.id = lf.license_id
JOIN feature_packages fp ON fp.code = COALESCE(NULLIF(btrim(l.plan_name), ''), 'legacy-package')
JOIN feature_catalog fc ON fc.code = lf.feature
ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(source_reference, '')) DO NOTHING;

-- Seed new RBAC-centric feature catalog entries
INSERT INTO feature_catalog (code, name, category, description, phase, is_delegatable)
VALUES
  ('rbac.core', 'RBAC Core Management', 'rbac', 'Access to foundational RBAC dashboard and insights.', 'ga', false),
  ('rbac.role.catalog', 'Role & Bundle Catalog', 'rbac', 'Browse and align role/bundle registries.', 'beta', false),
  ('rbac.bundle.compose', 'Bundle Composer', 'rbac', 'Compose reusable permission bundles via guided wizard.', 'beta', false),
  ('rbac.surface.manage', 'Surface Binding Manager', 'rbac', 'Link roles/bundles to menus and metadata surfaces.', 'beta', false),
  ('rbac.delegated.console', 'Delegated Access Console', 'rbac', 'Scoped console for delegated ministry roles.', 'alpha', true),
  ('rbac.audit.ops', 'RBAC Audit Dashboard', 'rbac', 'Operational oversight of RBAC changes and publish health.', 'beta', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  phase = EXCLUDED.phase,
  is_delegatable = EXCLUDED.is_delegatable,
  updated_at = now();

-- Drop legacy license tables now that data has been migrated
DROP TABLE IF EXISTS license_features;
DROP TABLE IF EXISTS licenses;

-- Rebuild feature-dependent views and helpers
CREATE OR REPLACE VIEW active_tenant_feature_codes AS
SELECT DISTINCT
  tfg.tenant_id,
  fc.code AS feature_code,
  tfg.grant_source,
  tfg.package_id,
  tfg.starts_at,
  tfg.expires_at
FROM tenant_feature_grants tfg
JOIN feature_catalog fc ON fc.id = tfg.feature_id
WHERE fc.is_active = true
  AND (tfg.starts_at IS NULL OR tfg.starts_at <= CURRENT_DATE)
  AND (tfg.expires_at IS NULL OR tfg.expires_at >= CURRENT_DATE);

CREATE OR REPLACE FUNCTION tenant_has_feature(feature_code text, tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM active_tenant_feature_codes atfc
    WHERE atfc.tenant_id = effective_tenant_id
      AND atfc.feature_code = feature_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION can_access_feature(feature_code text, tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = effective_tenant_id
  ) AND tenant_has_feature(feature_code, effective_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION can_access_metadata_surface(
  p_surface_id text,
  p_user_id uuid,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  surface_record metadata_surfaces;
  user_role_keys text[];
BEGIN
  effective_tenant_id := COALESCE(p_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO surface_record
  FROM metadata_surfaces
  WHERE id = p_surface_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF surface_record.feature_code IS NOT NULL THEN
    IF NOT tenant_has_feature(surface_record.feature_code, effective_tenant_id) THEN
      RETURN false;
    END IF;
  END IF;

  IF (surface_record.rbac_role_keys IS NULL OR array_length(surface_record.rbac_role_keys, 1) = 0)
     AND (surface_record.rbac_bundle_keys IS NULL OR array_length(surface_record.rbac_bundle_keys, 1) = 0) THEN
    RETURN true;
  END IF;

  user_role_keys := get_user_role_metadata_keys(p_user_id, effective_tenant_id);

  IF surface_record.rbac_role_keys IS NOT NULL AND user_role_keys && surface_record.rbac_role_keys THEN
    RETURN true;
  END IF;

  IF surface_record.rbac_bundle_keys IS NOT NULL AND user_role_keys && surface_record.rbac_bundle_keys THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE VIEW user_menu_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  mi.id AS menu_item_id,
  mi.code AS menu_code,
  mi.label AS menu_label,
  mi.path AS menu_path,
  mi.icon AS menu_icon,
  mi.sort_order,
  mi.feature_code AS menu_feature_code,
  rsb.required_feature_code AS binding_feature_code,
  ms.id AS metadata_blueprint_id,
  ms.surface_type,
  ms.phase,
  CASE
    WHEN mi.feature_code IS NOT NULL THEN tenant_has_feature(mi.feature_code, ur.tenant_id)
    WHEN rsb.required_feature_code IS NOT NULL THEN tenant_has_feature(rsb.required_feature_code, ur.tenant_id)
    ELSE true
  END AS has_license_access,
  CASE
    WHEN rsb.role_id IS NOT NULL THEN 'role'
    WHEN rsb.bundle_id IS NOT NULL THEN 'bundle'
    ELSE 'direct'
  END AS access_type
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN menu_items mi ON mi.tenant_id = ur.tenant_id AND mi.deleted_at IS NULL
LEFT JOIN rbac_surface_bindings rsb ON (
  rsb.tenant_id = ur.tenant_id
  AND rsb.menu_item_id = mi.id
  AND rsb.is_active = true
  AND (
    rsb.role_id = ur.role_id OR EXISTS (
      SELECT 1 FROM role_bundles rb
      WHERE rb.role_id = ur.role_id
        AND rb.bundle_id = rsb.bundle_id
        AND rb.tenant_id = ur.tenant_id
    )
  )
)
LEFT JOIN metadata_surfaces ms ON ms.id = rsb.metadata_blueprint_id OR ms.id = mi.metadata_blueprint_id
WHERE rsb.id IS NOT NULL OR NOT EXISTS (
  SELECT 1 FROM rbac_surface_bindings rsb2
  WHERE rsb2.menu_item_id = mi.id
    AND rsb2.tenant_id = mi.tenant_id
    AND rsb2.is_active = true
);

CREATE OR REPLACE VIEW user_metadata_surface_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  ms.id AS metadata_surface_id,
  ms.module,
  ms.route,
  ms.title,
  ms.feature_code,
  ms.surface_type,
  ms.phase,
  r.metadata_key AS role_metadata_key,
  pb.metadata_key AS bundle_metadata_key,
  CASE
    WHEN ms.rbac_role_keys IS NOT NULL AND array_length(ms.rbac_role_keys, 1) > 0 THEN r.metadata_key = ANY(ms.rbac_role_keys)
    WHEN ms.rbac_bundle_keys IS NOT NULL AND array_length(ms.rbac_bundle_keys, 1) > 0 THEN EXISTS (
      SELECT 1 FROM role_bundles rb
      JOIN permission_bundles pb2 ON rb.bundle_id = pb2.id
      WHERE rb.role_id = ur.role_id
        AND rb.tenant_id = ur.tenant_id
        AND pb2.metadata_key = ANY(ms.rbac_bundle_keys)
    )
    ELSE true
  END AS has_rbac_access,
  CASE
    WHEN ms.feature_code IS NOT NULL THEN tenant_has_feature(ms.feature_code, ur.tenant_id)
    ELSE true
  END AS has_license_access
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_bundles rb ON rb.role_id = ur.role_id AND rb.tenant_id = ur.tenant_id
LEFT JOIN permission_bundles pb ON rb.bundle_id = pb.id
JOIN metadata_surfaces ms ON TRUE;

CREATE OR REPLACE FUNCTION get_user_menu_with_metadata(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  sort_order integer,
  feature_code text,
  metadata_blueprint_id text,
  surface_type text,
  phase text,
  can_access boolean
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    mi.id,
    mi.code,
    mi.label,
    mi.path,
    mi.icon,
    mi.sort_order,
    mi.feature_code,
    COALESCE(rsb.metadata_blueprint_id, mi.metadata_blueprint_id) AS metadata_blueprint_id,
    ms.surface_type,
    ms.phase,
    (
      (mi.feature_code IS NULL OR tenant_has_feature(mi.feature_code, effective_tenant_id))
      AND (
        rsb.id IS NULL OR EXISTS (
          SELECT 1 FROM tenant_user_effective_permissions tuep
          WHERE tuep.tenant_id = effective_tenant_id
            AND tuep.user_id = target_user_id
            AND (
              (rsb.role_id IS NOT NULL AND tuep.role_id = rsb.role_id)
              OR (rsb.bundle_id IS NOT NULL AND tuep.bundle_id = rsb.bundle_id)
            )
        )
      )
      AND (
        COALESCE(rsb.metadata_blueprint_id, mi.metadata_blueprint_id) IS NULL
        OR can_access_metadata_surface(COALESCE(rsb.metadata_blueprint_id, mi.metadata_blueprint_id), target_user_id, effective_tenant_id)
      )
    ) AS can_access
  FROM menu_items mi
  LEFT JOIN rbac_surface_bindings rsb ON rsb.menu_item_id = mi.id
    AND rsb.tenant_id = mi.tenant_id
    AND rsb.is_active = true
  LEFT JOIN metadata_surfaces ms ON ms.id = COALESCE(rsb.metadata_blueprint_id, mi.metadata_blueprint_id)
  WHERE mi.tenant_id = effective_tenant_id
    AND mi.deleted_at IS NULL
  ORDER BY mi.sort_order, mi.label;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_licensed_menu_items(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  metadata_blueprint_id text,
  feature_code text,
  can_access boolean
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    uma.menu_item_id,
    uma.menu_code,
    uma.menu_label,
    uma.menu_path,
    uma.menu_icon,
    uma.metadata_blueprint_id,
    COALESCE(uma.menu_feature_code, uma.binding_feature_code) AS feature_code,
    uma.has_license_access
  FROM user_menu_access uma
  WHERE uma.tenant_id = effective_tenant_id
    AND uma.user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_accessible_metadata_surfaces(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metadata_surface_id text,
  module text,
  route text,
  title text,
  feature_code text,
  surface_type text,
  phase text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    umas.metadata_surface_id,
    umas.module,
    umas.route,
    umas.title,
    umas.feature_code,
    umas.surface_type,
    umas.phase
  FROM user_metadata_surface_access umas
  WHERE umas.tenant_id = effective_tenant_id
    AND umas.user_id = target_user_id
    AND umas.has_rbac_access = true
    AND umas.has_license_access = true
  ORDER BY umas.module, umas.route;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_licensed_metadata_surfaces(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metadata_surface_id text,
  module text,
  route text,
  title text,
  feature_code text,
  surface_type text,
  phase text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    umas.metadata_surface_id,
    umas.module,
    umas.route,
    umas.title,
    umas.feature_code,
    umas.surface_type,
    umas.phase
  FROM user_metadata_surface_access umas
  WHERE umas.tenant_id = effective_tenant_id
    AND umas.user_id = target_user_id
    AND umas.has_license_access = true;
END;
$$;

CREATE OR REPLACE FUNCTION register_metadata_surface(
  p_surface_id text,
  p_module text,
  p_route text,
  p_blueprint_path text,
  p_surface_type text,
  p_phase text,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_feature_code text DEFAULT NULL,
  p_rbac_roles text[] DEFAULT NULL,
  p_rbac_bundles text[] DEFAULT NULL,
  p_default_menu_code text DEFAULT NULL,
  p_supports_mobile boolean DEFAULT true,
  p_supports_desktop boolean DEFAULT true
)
RETURNS text
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO metadata_surfaces (
    id,
    module,
    route,
    blueprint_path,
    surface_type,
    phase,
    title,
    description,
    feature_code,
    rbac_role_keys,
    rbac_bundle_keys,
    default_menu_code,
    supports_mobile,
    supports_desktop,
    created_by,
    updated_by
  ) VALUES (
    p_surface_id,
    p_module,
    p_route,
    p_blueprint_path,
    p_surface_type,
    p_phase,
    p_title,
    p_description,
    p_feature_code,
    p_rbac_roles,
    p_rbac_bundles,
    p_default_menu_code,
    p_supports_mobile,
    p_supports_desktop,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    module = EXCLUDED.module,
    route = EXCLUDED.route,
    blueprint_path = EXCLUDED.blueprint_path,
    surface_type = EXCLUDED.surface_type,
    phase = EXCLUDED.phase,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    feature_code = EXCLUDED.feature_code,
    rbac_role_keys = EXCLUDED.rbac_role_keys,
    rbac_bundle_keys = EXCLUDED.rbac_bundle_keys,
    default_menu_code = EXCLUDED.default_menu_code,
    supports_mobile = EXCLUDED.supports_mobile,
    supports_desktop = EXCLUDED.supports_desktop,
    updated_by = auth.uid(),
    updated_at = now();

  RETURN p_surface_id;
END;
$$;

CREATE OR REPLACE FUNCTION rebuild_rbac_metadata_surfaces(p_tenant_id uuid DEFAULT NULL)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  target_tenant uuid := COALESCE(p_tenant_id, current_tenant());
BEGIN
  IF target_tenant IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM rbac_surface_bindings
  WHERE tenant_id = target_tenant
    AND metadata_blueprint_id IS NOT NULL
    AND is_active = false;

  PERFORM refresh_tenant_user_effective_permissions_safe();
END;
$$;

-- Refresh helper stored procedure to align unique index names
DROP FUNCTION IF EXISTS fix_rbac_surface_bindings();
CREATE OR REPLACE FUNCTION fix_rbac_surface_bindings()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure unique indexes exist with new metadata blueprint column naming
  PERFORM 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'rbac_surface_bindings_role_surface_unique_idx';
  IF NOT FOUND THEN
    CREATE UNIQUE INDEX rbac_surface_bindings_role_surface_unique_idx
      ON rbac_surface_bindings (
        tenant_id,
        role_id,
        COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(metadata_blueprint_id, '')
      )
      WHERE role_id IS NOT NULL;
  END IF;

  PERFORM 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'rbac_surface_bindings_bundle_surface_unique_idx';
  IF NOT FOUND THEN
    CREATE UNIQUE INDEX rbac_surface_bindings_bundle_surface_unique_idx
      ON rbac_surface_bindings (
        tenant_id,
        bundle_id,
        COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(metadata_blueprint_id, '')
      )
      WHERE bundle_id IS NOT NULL;
  END IF;
END;
$$;

-- Rebuild policies incorporating feature entitlements
ALTER TABLE metadata_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_surface_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metadata surfaces readable" ON metadata_surfaces
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Metadata surface overlays readable" ON metadata_surface_overlays
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Feature catalog readable" ON feature_catalog
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Feature packages readable" ON feature_packages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Feature package items readable" ON feature_package_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Tenant feature grants managed within tenant" ON tenant_feature_grants
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- updated_at triggers for new tables
CREATE TRIGGER update_metadata_surfaces_updated_at
BEFORE UPDATE ON metadata_surfaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_metadata_surface_overlays_updated_at
BEFORE UPDATE ON metadata_surface_overlays
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_catalog_updated_at
BEFORE UPDATE ON feature_catalog
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_packages_updated_at
BEFORE UPDATE ON feature_packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_feature_grants_updated_at
BEFORE UPDATE ON tenant_feature_grants
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Restore grants
GRANT SELECT ON metadata_surfaces TO authenticated;
GRANT SELECT ON metadata_surface_overlays TO authenticated;
GRANT SELECT ON feature_catalog TO authenticated;
GRANT SELECT ON feature_packages TO authenticated;
GRANT SELECT ON feature_package_items TO authenticated;
GRANT SELECT ON tenant_feature_grants TO authenticated;
GRANT SELECT ON active_tenant_feature_codes TO authenticated;
GRANT SELECT ON user_menu_access TO authenticated;
GRANT SELECT ON user_metadata_surface_access TO authenticated;

GRANT EXECUTE ON FUNCTION tenant_has_feature(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_feature(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_metadata_surface(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_menu_with_metadata(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_licensed_menu_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_metadata_surfaces(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_licensed_metadata_surfaces(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION register_metadata_surface(text, text, text, text, text, text, text, text, text, text[], text[], text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_rbac_metadata_surfaces(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_rbac_surface_bindings() TO authenticated;

COMMENT ON TABLE metadata_surfaces IS 'Metadata-driven surface registry replacing legacy metadata_pages with blueprint-oriented RBAC alignment.';
COMMENT ON TABLE metadata_surface_overlays IS 'Persona overlays associated with metadata surfaces to support delegated RBAC experiences.';
COMMENT ON TABLE feature_catalog IS 'Catalog of available platform features used for licensing and feature gating.';
COMMENT ON TABLE tenant_feature_grants IS 'Tenant-scoped feature entitlements sourced from packages, trials, or direct grants.';
COMMENT ON VIEW active_tenant_feature_codes IS 'Active feature entitlements per tenant derived from feature grants.';
COMMENT ON VIEW user_metadata_surface_access IS 'Resolved metadata surfaces available to a user after RBAC and feature evaluation.';
COMMENT ON FUNCTION get_user_accessible_metadata_surfaces(uuid, uuid) IS 'Returns metadata surfaces a user can access after RBAC and licensing checks.';

COMMIT;
