-- =====================================================================================
-- MIGRATION: Add get_feature_change_summary Function
-- =====================================================================================
-- This migration creates a SECURITY DEFINER function to get feature change summaries
-- for license assignments, bypassing RLS restrictions for super admins.
-- =====================================================================================

-- Create function to get feature change summary
CREATE OR REPLACE FUNCTION get_feature_change_summary(
  p_tenant_id uuid,
  p_new_offering_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_offering_id uuid;
  v_new_features json;
  v_current_features json;
  v_result json;
BEGIN
  -- Only allow super_admins to get feature change summaries
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can view feature change summaries.';
  END IF;

  -- Get current offering for the tenant
  SELECT subscription_offering_id INTO v_current_offering_id
  FROM tenants
  WHERE id = p_tenant_id;

  -- Get features from new offering
  SELECT json_agg(
    json_build_object(
      'id', fc.id,
      'name', fc.name,
      'description', fc.description
    )
  ) INTO v_new_features
  FROM product_offering_features pof
  JOIN feature_catalog fc ON fc.id = pof.feature_id
  WHERE pof.offering_id = p_new_offering_id;

  -- Get features from current offering (if exists)
  IF v_current_offering_id IS NOT NULL THEN
    SELECT json_agg(
      json_build_object(
        'id', fc.id,
        'name', fc.name,
        'description', fc.description
      )
    ) INTO v_current_features
    FROM product_offering_features pof
    JOIN feature_catalog fc ON fc.id = pof.feature_id
    WHERE pof.offering_id = v_current_offering_id;
  ELSE
    v_current_features := '[]'::json;
  END IF;

  -- Build result
  v_result := json_build_object(
    'currentOfferingId', v_current_offering_id,
    'newOfferingId', p_new_offering_id,
    'newFeatures', COALESCE(v_new_features, '[]'::json),
    'currentFeatures', COALESCE(v_current_features, '[]'::json)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_feature_change_summary IS 'Returns feature change summary for a license assignment. Only accessible by super_admins.';

-- Grant execute permission to authenticated users (function will check role internally)
GRANT EXECUTE ON FUNCTION get_feature_change_summary(uuid, uuid) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
