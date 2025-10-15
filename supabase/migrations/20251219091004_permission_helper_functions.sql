-- =====================================================================================
-- MIGRATION: Permission Helper Functions
-- =====================================================================================
-- Creates database functions to query feature permissions and templates
--
-- Part of: Feature Creation with Surface ID & Permission Definition
-- Phase: 1 (Foundation)
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- FUNCTION: get_feature_permissions_with_templates
-- =====================================================================================
-- Returns all permissions for a feature with their default role templates
-- Used when displaying feature details in Licensing Studio
CREATE OR REPLACE FUNCTION get_feature_permissions_with_templates(p_feature_id uuid)
RETURNS TABLE (
  result_permission_id uuid,
  result_permission_code text,
  result_display_name text,
  result_description text,
  result_category text,
  result_action text,
  result_is_required boolean,
  result_default_roles jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access this function
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can access feature permissions.';
  END IF;

  RETURN QUERY
  SELECT
    fp.id AS result_permission_id,
    fp.permission_code AS result_permission_code,
    fp.display_name AS result_display_name,
    fp.description AS result_description,
    fp.category AS result_category,
    fp.action AS result_action,
    fp.is_required AS result_is_required,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'role_key', prt.role_key,
          'is_recommended', prt.is_recommended,
          'reason', prt.reason
        ) ORDER BY prt.role_key
      ) FILTER (WHERE prt.id IS NOT NULL),
      '[]'::jsonb
    ) AS result_default_roles
  FROM feature_permissions fp
  LEFT JOIN permission_role_templates prt ON prt.feature_permission_id = fp.id
  WHERE fp.feature_id = p_feature_id
  GROUP BY fp.id, fp.permission_code, fp.display_name, fp.description,
           fp.category, fp.action, fp.is_required
  ORDER BY fp.display_order, fp.permission_code;
END;
$$;

-- =====================================================================================
-- FUNCTION: get_tenant_licensed_features_with_permissions
-- =====================================================================================
-- Returns all licensed features for a tenant with their permissions
-- Used when Tenant Admins view their licensed features
CREATE OR REPLACE FUNCTION get_tenant_licensed_features_with_permissions(p_tenant_id uuid)
RETURNS TABLE (
  result_feature_id uuid,
  result_feature_code text,
  result_feature_name text,
  result_surface_id text,
  result_permissions jsonb
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id AS result_feature_id,
    fc.code AS result_feature_code,
    fc.name AS result_feature_name,
    fc.surface_id AS result_surface_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'code', fp.permission_code,
          'name', fp.display_name,
          'description', fp.description,
          'is_required', fp.is_required,
          'category', fp.category,
          'action', fp.action
        ) ORDER BY fp.display_order
      ) FILTER (WHERE fp.id IS NOT NULL),
      '[]'::jsonb
    ) AS result_permissions
  FROM feature_catalog fc
  JOIN tenant_feature_grants tfg ON tfg.feature_id = fc.id
  LEFT JOIN feature_permissions fp ON fp.feature_id = fc.id
  WHERE tfg.tenant_id = p_tenant_id
    AND fc.is_active = true
    AND fc.deleted_at IS NULL
    AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
  GROUP BY fc.id, fc.code, fc.name, fc.surface_id
  ORDER BY fc.name;
END;
$$;

-- =====================================================================================
-- FUNCTION: is_permission_code_available
-- =====================================================================================
-- Checks if a permission code is available for use
-- Returns false if the code is already in use by another permission
CREATE OR REPLACE FUNCTION is_permission_code_available(
  p_permission_code text,
  p_feature_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM feature_permissions fp
    WHERE fp.permission_code = p_permission_code
      AND (p_feature_id IS NULL OR fp.feature_id != p_feature_id)
  );
$$;

-- =====================================================================================
-- FUNCTION: get_features_with_surfaces
-- =====================================================================================
-- Returns all features that have associated surfaces
-- Used for reporting and validation
CREATE OR REPLACE FUNCTION get_features_with_surfaces()
RETURNS TABLE (
  result_feature_id uuid,
  result_feature_code text,
  result_feature_name text,
  result_surface_id text,
  result_surface_type text,
  result_module text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access this function
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can access feature catalog.';
  END IF;

  RETURN QUERY
  SELECT
    fc.id AS result_feature_id,
    fc.code AS result_feature_code,
    fc.name AS result_feature_name,
    fc.surface_id AS result_surface_id,
    fc.surface_type AS result_surface_type,
    fc.module AS result_module
  FROM feature_catalog fc
  WHERE fc.surface_id IS NOT NULL
    AND fc.is_active = true
    AND fc.deleted_at IS NULL
  ORDER BY fc.module, fc.code;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_feature_permissions_with_templates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_licensed_features_with_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_permission_code_available(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_features_with_surfaces() TO authenticated;

-- Add documentation comments
COMMENT ON FUNCTION get_feature_permissions_with_templates IS
  'Returns all permissions for a feature with default role templates. Only accessible by super_admins. Used in Licensing Studio.';

COMMENT ON FUNCTION get_tenant_licensed_features_with_permissions IS
  'Returns all licensed features for a tenant with their permissions. Used by Tenant Admins to view licensed features.';

COMMENT ON FUNCTION is_permission_code_available IS
  'Checks if a permission code is available for use. Returns false if already in use. Optional feature_id parameter excludes that feature from the check.';

COMMENT ON FUNCTION get_features_with_surfaces IS
  'Returns all features that have associated metadata surfaces. Only accessible by super_admins. Used for reporting and validation.';

COMMIT;
