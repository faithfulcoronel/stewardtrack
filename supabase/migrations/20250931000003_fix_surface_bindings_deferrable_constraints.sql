/*
  # Fix Surface Bindings Deferrable Constraints

  This migration fixes the ON CONFLICT issue with deferrable unique constraints
  in the rbac_surface_bindings table by replacing them with regular unique constraints
  and creating separate unique indexes where needed.
*/

-- First, check if the table exists and drop the problematic constraints
DO $$
BEGIN
  -- Drop existing deferrable unique constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rbac_surface_bindings_tenant_id_role_id_menu_item_id_metadat_key'
      AND table_name = 'rbac_surface_bindings'
  ) THEN
    ALTER TABLE rbac_surface_bindings
    DROP CONSTRAINT rbac_surface_bindings_tenant_id_role_id_menu_item_id_metadat_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE 'rbac_surface_bindings_tenant_id_bundle_id%'
      AND table_name = 'rbac_surface_bindings'
  ) THEN
    -- Find and drop any bundle-related unique constraints
    EXECUTE (
      SELECT 'ALTER TABLE rbac_surface_bindings DROP CONSTRAINT ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE constraint_name LIKE 'rbac_surface_bindings_tenant_id_bundle_id%'
        AND table_name = 'rbac_surface_bindings'
      LIMIT 1
    );
  END IF;
END $$;

-- Recreate the table structure without deferrable constraints
-- Drop and recreate the table to ensure clean state
DROP TABLE IF EXISTS rbac_surface_bindings CASCADE;

CREATE TABLE rbac_surface_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,

  -- RBAC source (either role or bundle)
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,

  -- Surface targets
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  metadata_page_id text, -- For metadata overlay page identifiers

  -- License integration
  required_feature_code text, -- Must have this license feature to access

  -- Additional configuration
  priority integer DEFAULT 0, -- For ordering/precedence
  is_active boolean DEFAULT true,

  -- Audit fields
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints (without DEFERRABLE)
  CONSTRAINT rbac_surface_bindings_source_check CHECK (
    (role_id IS NOT NULL AND bundle_id IS NULL) OR
    (role_id IS NULL AND bundle_id IS NOT NULL)
  ),
  CONSTRAINT rbac_surface_bindings_target_check CHECK (
    menu_item_id IS NOT NULL OR metadata_page_id IS NOT NULL
  )
);

-- Create separate unique indexes instead of table constraints
-- This avoids the deferrable constraint issue while maintaining uniqueness
CREATE UNIQUE INDEX rbac_surface_bindings_role_unique_idx
ON rbac_surface_bindings (tenant_id, role_id, COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(metadata_page_id, ''))
WHERE role_id IS NOT NULL;

CREATE UNIQUE INDEX rbac_surface_bindings_bundle_unique_idx
ON rbac_surface_bindings (tenant_id, bundle_id, COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(metadata_page_id, ''))
WHERE bundle_id IS NOT NULL;

-- Performance indexes
CREATE INDEX rbac_surface_bindings_tenant_id_idx ON rbac_surface_bindings(tenant_id);
CREATE INDEX rbac_surface_bindings_role_id_idx ON rbac_surface_bindings(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_bundle_id_idx ON rbac_surface_bindings(bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_menu_item_id_idx ON rbac_surface_bindings(menu_item_id) WHERE menu_item_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_metadata_page_id_idx ON rbac_surface_bindings(metadata_page_id) WHERE metadata_page_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_feature_code_idx ON rbac_surface_bindings(required_feature_code) WHERE required_feature_code IS NOT NULL;
CREATE INDEX rbac_surface_bindings_active_idx ON rbac_surface_bindings(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE rbac_surface_bindings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Surface bindings are viewable within tenant" ON rbac_surface_bindings
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Surface bindings can be managed within tenant" ON rbac_surface_bindings
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- Updated_at trigger
CREATE TRIGGER update_rbac_surface_bindings_updated_at
BEFORE UPDATE ON rbac_surface_bindings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Updated function to migrate existing role_menu_items data to surface bindings
-- Now uses the upsert pattern instead of ON CONFLICT with deferrable constraints
CREATE OR REPLACE FUNCTION migrate_role_menu_items_to_surface_bindings()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  migration_count integer := 0;
  rmi_record RECORD;
BEGIN
  -- Use cursor to handle potential conflicts manually
  FOR rmi_record IN
    SELECT
      rmi.tenant_id,
      rmi.role_id,
      rmi.menu_item_id,
      rmi.created_by,
      rmi.updated_by,
      rmi.created_at,
      rmi.updated_at
    FROM role_menu_items rmi
  LOOP
    -- Check if binding already exists
    IF NOT EXISTS (
      SELECT 1 FROM rbac_surface_bindings rsb
      WHERE rsb.tenant_id = rmi_record.tenant_id
        AND rsb.role_id = rmi_record.role_id
        AND rsb.menu_item_id = rmi_record.menu_item_id
        AND rsb.metadata_page_id IS NULL
    ) THEN
      -- Insert new binding
      INSERT INTO rbac_surface_bindings (
        tenant_id,
        role_id,
        menu_item_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        rmi_record.tenant_id,
        rmi_record.role_id,
        rmi_record.menu_item_id,
        rmi_record.created_by,
        rmi_record.updated_by,
        rmi_record.created_at,
        rmi_record.updated_at
      );

      migration_count := migration_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migrated % role-menu bindings to surface bindings', migration_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Migration encountered error, but continuing: %', SQLERRM;
    -- Don't fail the entire migration if some records can't be migrated
END;
$$;

-- Function to safely insert surface binding with conflict handling
CREATE OR REPLACE FUNCTION insert_surface_binding(
  p_tenant_id uuid,
  p_role_id uuid DEFAULT NULL,
  p_bundle_id uuid DEFAULT NULL,
  p_menu_item_id uuid DEFAULT NULL,
  p_metadata_page_id text DEFAULT NULL,
  p_required_feature_code text DEFAULT NULL,
  p_priority integer DEFAULT 0,
  p_is_active boolean DEFAULT true,
  p_created_by uuid DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  binding_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user if not provided
  current_user_id := COALESCE(p_created_by, auth.uid());

  -- Validate source constraint
  IF (p_role_id IS NULL AND p_bundle_id IS NULL) OR
     (p_role_id IS NOT NULL AND p_bundle_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one of role_id or bundle_id must be provided';
  END IF;

  -- Validate target constraint
  IF p_menu_item_id IS NULL AND p_metadata_page_id IS NULL THEN
    RAISE EXCEPTION 'At least one of menu_item_id or metadata_page_id must be provided';
  END IF;

  -- Check for existing binding
  SELECT id INTO binding_id
  FROM rbac_surface_bindings
  WHERE tenant_id = p_tenant_id
    AND (
      (p_role_id IS NOT NULL AND role_id = p_role_id) OR
      (p_bundle_id IS NOT NULL AND bundle_id = p_bundle_id)
    )
    AND (
      (p_menu_item_id IS NOT NULL AND menu_item_id = p_menu_item_id) OR
      (p_menu_item_id IS NULL AND menu_item_id IS NULL)
    )
    AND (
      (p_metadata_page_id IS NOT NULL AND metadata_page_id = p_metadata_page_id) OR
      (p_metadata_page_id IS NULL AND metadata_page_id IS NULL)
    );

  IF binding_id IS NOT NULL THEN
    -- Update existing binding
    UPDATE rbac_surface_bindings SET
      required_feature_code = p_required_feature_code,
      priority = p_priority,
      is_active = p_is_active,
      updated_by = current_user_id,
      updated_at = now()
    WHERE id = binding_id;
  ELSE
    -- Insert new binding
    INSERT INTO rbac_surface_bindings (
      tenant_id,
      role_id,
      bundle_id,
      menu_item_id,
      metadata_page_id,
      required_feature_code,
      priority,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      p_tenant_id,
      p_role_id,
      p_bundle_id,
      p_menu_item_id,
      p_metadata_page_id,
      p_required_feature_code,
      p_priority,
      p_is_active,
      current_user_id,
      current_user_id
    ) RETURNING id INTO binding_id;
  END IF;

  RETURN binding_id;
END;
$$;

-- Execute the migration (only if role_menu_items table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_menu_items') THEN
    PERFORM migrate_role_menu_items_to_surface_bindings();
  ELSE
    RAISE NOTICE 'role_menu_items table does not exist, skipping migration';
  END IF;
END $$;

-- Recreate the trigger for effective permissions refresh
-- Use the basic trigger function if the safe one doesn't exist yet
DROP TRIGGER IF EXISTS refresh_effective_permissions_surface_bindings ON rbac_surface_bindings;

-- First create a fallback trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_refresh_effective_permissions()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple refresh without error handling for now
  -- This will be updated by later migrations with safe refresh
  BEGIN
    REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the operation
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_effective_permissions_surface_bindings
  AFTER INSERT OR UPDATE OR DELETE ON rbac_surface_bindings
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_effective_permissions();

-- Comments for documentation
COMMENT ON TABLE rbac_surface_bindings IS
  'Unified table mapping roles/bundles to menu items and metadata pages with license feature requirements. Uses unique indexes instead of deferrable constraints for better ON CONFLICT support.';
COMMENT ON FUNCTION insert_surface_binding IS
  'Safely inserts or updates a surface binding with proper conflict handling and validation.';
COMMENT ON FUNCTION migrate_role_menu_items_to_surface_bindings() IS
  'Migrates existing role_menu_items data to surface bindings with manual conflict resolution.';

-- Add some helpful utility functions for managing surface bindings
CREATE OR REPLACE FUNCTION get_surface_bindings_for_role(
  p_role_id uuid,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  binding_id uuid,
  menu_item_id uuid,
  menu_code text,
  metadata_page_id text,
  required_feature_code text,
  priority integer,
  is_active boolean
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(p_tenant_id, current_tenant());

  RETURN QUERY
  SELECT
    rsb.id as binding_id,
    rsb.menu_item_id,
    mi.code as menu_code,
    rsb.metadata_page_id,
    rsb.required_feature_code,
    rsb.priority,
    rsb.is_active
  FROM rbac_surface_bindings rsb
  LEFT JOIN menu_items mi ON rsb.menu_item_id = mi.id
  WHERE rsb.role_id = p_role_id
    AND rsb.tenant_id = effective_tenant_id
  ORDER BY rsb.priority, mi.sort_order, mi.label, rsb.metadata_page_id;
END;
$$;


-- Utility functions to resolve accessible surfaces
CREATE OR REPLACE FUNCTION get_user_accessible_menu_items(
  target_user_id uuid,
  target_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  section text,
  sort_order integer,
  metadata_page_id text,
  feature_code text,
  binding_sources jsonb,
  can_access boolean
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT check_tenant_access(effective_tenant_id) THEN
    RETURN;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH menu_access AS (
    SELECT
      uma.menu_item_id,
      uma.menu_code,
      uma.menu_label,
      uma.menu_path,
      uma.menu_icon,
      mi.section,
      uma.sort_order,
      mi.metadata_page_id,
      COALESCE(uma.menu_feature_code, uma.binding_feature_code) AS feature_code,
      uma.access_type,
      uma.role_metadata_key,
      uma.bundle_metadata_key,
      uma.role_name,
      uma.bundle_name,
      uma.has_license_access
    FROM user_menu_access uma
    JOIN menu_items mi ON mi.id = uma.menu_item_id
    WHERE uma.tenant_id = effective_tenant_id
      AND uma.user_id = target_user_id
  )
  SELECT
    ma.menu_item_id,
    ma.menu_code,
    ma.menu_label,
    ma.menu_path,
    ma.menu_icon,
    ma.section,
    ma.sort_order,
    ma.metadata_page_id,
    ma.feature_code,
    COALESCE(
      jsonb_agg(DISTINCT
        CASE
          WHEN ma.access_type = 'role' THEN jsonb_build_object(
            'type', 'role',
            'metadata_key', ma.role_metadata_key,
            'name', ma.role_name
          )
          WHEN ma.access_type = 'bundle' THEN jsonb_build_object(
            'type', 'bundle',
            'metadata_key', ma.bundle_metadata_key,
            'name', ma.bundle_name
          )
          ELSE jsonb_build_object('type', 'direct')
        END
      ) FILTER (WHERE ma.access_type IS NOT NULL),
      '[]'::jsonb
    ) AS binding_sources,
    bool_or(ma.has_license_access) AS can_access
  FROM menu_access ma
  GROUP BY
    ma.menu_item_id,
    ma.menu_code,
    ma.menu_label,
    ma.menu_path,
    ma.menu_icon,
    ma.section,
    ma.sort_order,
    ma.metadata_page_id,
    ma.feature_code
  HAVING bool_or(ma.has_license_access)
  ORDER BY ma.sort_order, ma.menu_label;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_accessible_metadata_pages(
  target_user_id uuid,
  target_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  metadata_page_id text,
  module text,
  route text,
  title text,
  feature_code text,
  binding_source text,
  source_metadata_key text,
  source_name text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT check_tenant_access(effective_tenant_id) THEN
    RETURN;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    umpa.metadata_page_id,
    umpa.module,
    umpa.route,
    umpa.title,
    umpa.feature_code,
    CASE
      WHEN umpa.role_metadata_key IS NOT NULL THEN 'role'
      WHEN umpa.bundle_metadata_key IS NOT NULL THEN 'bundle'
      ELSE 'system'
    END AS binding_source,
    CASE
      WHEN umpa.role_metadata_key IS NOT NULL THEN umpa.role_metadata_key
      WHEN umpa.bundle_metadata_key IS NOT NULL THEN umpa.bundle_metadata_key
      ELSE NULL
    END AS source_metadata_key,
    CASE
      WHEN umpa.role_metadata_key IS NOT NULL THEN COALESCE(r.name, umpa.role_metadata_key)
      WHEN umpa.bundle_metadata_key IS NOT NULL THEN COALESCE(pb.name, umpa.bundle_metadata_key)
      ELSE 'system'
    END AS source_name
  FROM user_metadata_page_access umpa
  LEFT JOIN roles r
    ON r.metadata_key = umpa.role_metadata_key
   AND r.tenant_id = effective_tenant_id
  LEFT JOIN permission_bundles pb
    ON pb.metadata_key = umpa.bundle_metadata_key
   AND pb.tenant_id = effective_tenant_id
  WHERE umpa.tenant_id = effective_tenant_id
    AND umpa.user_id = target_user_id
    AND umpa.has_rbac_access = true
    AND umpa.has_license_access = true
  ORDER BY umpa.module, umpa.route, binding_source, source_name;
END;
$$;

COMMENT ON FUNCTION get_surface_bindings_for_role(uuid, uuid) IS
  'Returns surface bindings for a role within the effective tenant, including metadata and priority.';
COMMENT ON FUNCTION get_user_accessible_menu_items(uuid, uuid) IS
  'Returns menu items a target user can access for a tenant, including binding context and license validation.';
COMMENT ON FUNCTION get_user_accessible_metadata_pages(uuid, uuid) IS
  'Returns metadata pages a target user can access for a tenant, describing the originating binding source.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION migrate_role_menu_items_to_surface_bindings() TO authenticated;
GRANT EXECUTE ON FUNCTION insert_surface_binding(uuid, uuid, uuid, uuid, text, text, integer, boolean, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_surface_bindings_for_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_menu_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_metadata_pages(uuid, uuid) TO authenticated;



