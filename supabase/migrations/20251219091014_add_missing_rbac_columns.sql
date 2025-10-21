-- Migration: Add Missing RBAC Columns
-- Purpose: Add missing 'code' column to roles table and 'surface_id' to rbac_surface_bindings
-- Date: 2025-12-19

-- ============================================================================
-- STEP 1: Add 'code' column to roles table (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'roles'
      AND column_name = 'code'
  ) THEN
    ALTER TABLE roles ADD COLUMN code text;
    COMMENT ON COLUMN roles.code IS 'Unique code identifier for the role (e.g., tenant_admin, staff, volunteer, member)';

    -- Create unique index on code per tenant
    CREATE UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Populate 'code' column for existing roles
-- ============================================================================

-- Generate code from name for existing roles that don't have one
UPDATE roles
SET code = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g'), '(^_+|_+$)', '', 'g'))
WHERE code IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- STEP 3: Add 'surface_id' column to rbac_surface_bindings (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings'
      AND column_name = 'surface_id'
  ) THEN
    ALTER TABLE rbac_surface_bindings
    ADD COLUMN surface_id text REFERENCES metadata_surfaces(id) ON DELETE CASCADE;

    COMMENT ON COLUMN rbac_surface_bindings.surface_id IS 'Links to metadata_surfaces table for UI surface access control';

    -- Create index for performance
    CREATE INDEX idx_rbac_surface_bindings_surface_id ON rbac_surface_bindings(surface_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify changes
-- ============================================================================

-- Log the changes
DO $$
DECLARE
  v_roles_code_exists boolean;
  v_bindings_surface_id_exists boolean;
BEGIN
  -- Check if roles.code exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'code'
  ) INTO v_roles_code_exists;

  -- Check if rbac_surface_bindings.surface_id exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings' AND column_name = 'surface_id'
  ) INTO v_bindings_surface_id_exists;

  -- Log results
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - roles.code column exists: %', v_roles_code_exists;
  RAISE NOTICE '  - rbac_surface_bindings.surface_id column exists: %', v_bindings_surface_id_exists;
END $$;
