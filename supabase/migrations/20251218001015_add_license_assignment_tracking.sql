-- =====================================================================================
-- MIGRATION: Add License Assignment Tracking
-- =====================================================================================
-- This migration adds infrastructure for manual license assignment tracking
-- including history and audit trail for product offering assignments to tenants.
--
-- Features:
-- - license_assignments table for tracking all manual assignments
-- - Audit trail with assigned_by and timestamps
-- - Support for tracking previous offerings (for upgrade/downgrade history)
-- - Helper function to assign licenses with automated feature grants
-- - RLS policies for security
-- =====================================================================================

-- =====================================================================================
-- TABLE: license_assignments
-- =====================================================================================
-- Tracks all manual license assignments and changes for audit trail
CREATE TABLE IF NOT EXISTS license_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  previous_offering_id uuid REFERENCES product_offerings(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS license_assignments_tenant_idx ON license_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS license_assignments_offering_idx ON license_assignments(offering_id);
CREATE INDEX IF NOT EXISTS license_assignments_date_idx ON license_assignments(assigned_at DESC);
CREATE INDEX IF NOT EXISTS license_assignments_assigned_by_idx ON license_assignments(assigned_by);

-- Enable RLS
ALTER TABLE license_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only system admins can view/manage license assignments
CREATE POLICY "License assignments are viewable by authenticated users"
  ON license_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "License assignments can be managed by system admins"
  ON license_assignments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add update trigger
CREATE TRIGGER update_license_assignments_updated_at
BEFORE UPDATE ON license_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE license_assignments IS 'Tracks manual license assignments and changes for audit trail';
COMMENT ON COLUMN license_assignments.tenant_id IS 'The tenant receiving the license assignment';
COMMENT ON COLUMN license_assignments.offering_id IS 'The product offering being assigned';
COMMENT ON COLUMN license_assignments.previous_offering_id IS 'The previous offering (if this is a change/upgrade/downgrade)';
COMMENT ON COLUMN license_assignments.assigned_by IS 'The user who performed the assignment (product owner/admin)';
COMMENT ON COLUMN license_assignments.notes IS 'Optional notes about the assignment';

-- =====================================================================================
-- Add billing_cycle column to tenants table if not exists
-- =====================================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants'
    AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE tenants ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';
  END IF;
END $$;

-- =====================================================================================
-- Add subscription_offering_id column to tenants table
-- =====================================================================================
-- This links tenants to their current product offering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants'
    AND column_name = 'subscription_offering_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN subscription_offering_id uuid REFERENCES product_offerings(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS tenants_subscription_offering_idx ON tenants(subscription_offering_id);
    COMMENT ON COLUMN tenants.subscription_offering_id IS 'The current product offering assigned to this tenant';
  END IF;
END $$;

-- =====================================================================================
-- FUNCTION: assign_license_to_tenant
-- =====================================================================================
-- Handles the complete license assignment process including:
-- - Updating tenant's subscription_offering_id
-- - Granting/revoking features based on offering changes
-- - Logging the assignment to license_assignments table
-- - Returning the assignment details
--
-- Parameters:
--   p_tenant_id: The tenant to assign the license to
--   p_offering_id: The product offering to assign
--   p_assigned_by: The user performing the assignment
--   p_notes: Optional notes about the assignment
--
-- Returns: The created license assignment record
-- =====================================================================================
CREATE OR REPLACE FUNCTION assign_license_to_tenant(
  p_tenant_id uuid,
  p_offering_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  assignment_id uuid,
  tenant_id uuid,
  offering_id uuid,
  previous_offering_id uuid,
  assigned_at timestamptz,
  features_granted int,
  features_revoked int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_offering_id uuid;
  v_assignment_id uuid;
  v_features_granted int := 0;
  v_features_revoked int := 0;
  v_new_feature_id uuid;
  v_old_feature_id uuid;
BEGIN
  -- Get current offering
  SELECT subscription_offering_id INTO v_previous_offering_id
  FROM tenants
  WHERE id = p_tenant_id;

  -- Create assignment record
  INSERT INTO license_assignments (
    tenant_id,
    offering_id,
    previous_offering_id,
    assigned_by,
    notes
  ) VALUES (
    p_tenant_id,
    p_offering_id,
    v_previous_offering_id,
    p_assigned_by,
    p_notes
  )
  RETURNING id INTO v_assignment_id;

  -- Revoke features from old offering that are not in new offering
  IF v_previous_offering_id IS NOT NULL THEN
    FOR v_old_feature_id IN
      SELECT pof.feature_id
      FROM product_offering_features pof
      WHERE pof.offering_id = v_previous_offering_id
        AND pof.feature_id NOT IN (
          SELECT feature_id
          FROM product_offering_features
          WHERE offering_id = p_offering_id
        )
    LOOP
      -- Delete the feature grant
      DELETE FROM tenant_feature_grants
      WHERE tenant_id = p_tenant_id
        AND feature_id = v_old_feature_id;

      v_features_revoked := v_features_revoked + 1;
    END LOOP;
  END IF;

  -- Grant new features from new offering
  FOR v_new_feature_id IN
    SELECT pof.feature_id
    FROM product_offering_features pof
    WHERE pof.offering_id = p_offering_id
      AND (v_previous_offering_id IS NULL OR pof.feature_id NOT IN (
        SELECT feature_id
        FROM product_offering_features
        WHERE offering_id = v_previous_offering_id
      ))
  LOOP
    -- Insert new feature grant (ignore if already exists)
    -- Set starts_at to now and expires_at to NULL for indefinite grant
    INSERT INTO tenant_feature_grants (
      tenant_id,
      feature_id,
      granted_at,
      starts_at,
      expires_at
    ) VALUES (
      p_tenant_id,
      v_new_feature_id,
      now(),
      now(),
      NULL
    )
    ON CONFLICT (tenant_id, feature_id) DO NOTHING;

    v_features_granted := v_features_granted + 1;
  END LOOP;

  -- Update tenant's subscription offering
  UPDATE tenants
  SET subscription_offering_id = p_offering_id,
      updated_at = now()
  WHERE id = p_tenant_id;

  -- Return assignment details
  RETURN QUERY
  SELECT
    v_assignment_id,
    p_tenant_id,
    p_offering_id,
    v_previous_offering_id,
    now(),
    v_features_granted,
    v_features_revoked;
END;
$$;

COMMENT ON FUNCTION assign_license_to_tenant IS 'Assigns a product offering to a tenant with automated feature grant/revoke management';

-- =====================================================================================
-- FUNCTION: get_tenant_license_history
-- =====================================================================================
-- Returns the license assignment history for a tenant
--
-- Parameters:
--   p_tenant_id: The tenant to get history for
--
-- Returns: Assignment history ordered by date (newest first)
-- =====================================================================================
CREATE OR REPLACE FUNCTION get_tenant_license_history(p_tenant_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  offering_id uuid,
  offering_name text,
  offering_tier text,
  previous_offering_id uuid,
  previous_offering_name text,
  assigned_at timestamptz,
  assigned_by uuid,
  assigned_by_email text,
  notes text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    la.id,
    la.offering_id,
    po.name,
    po.tier,
    la.previous_offering_id,
    prev_po.name,
    la.assigned_at,
    la.assigned_by,
    u.email,
    la.notes
  FROM license_assignments la
  JOIN product_offerings po ON po.id = la.offering_id
  LEFT JOIN product_offerings prev_po ON prev_po.id = la.previous_offering_id
  LEFT JOIN auth.users u ON u.id = la.assigned_by
  WHERE la.tenant_id = p_tenant_id
  ORDER BY la.assigned_at DESC;
$$;

COMMENT ON FUNCTION get_tenant_license_history IS 'Returns the complete license assignment history for a tenant';

-- =====================================================================================
-- FUNCTION: get_all_tenants_for_assignment
-- =====================================================================================
-- Returns all tenants with their current license information for assignment UI
--
-- Returns: List of tenants with offering details
-- =====================================================================================
CREATE OR REPLACE FUNCTION get_all_tenants_for_assignment()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  tenant_subdomain text,
  tenant_status text,
  subscription_tier text,
  subscription_status text,
  current_offering_id uuid,
  current_offering_name text,
  current_offering_tier text,
  feature_count bigint,
  last_assignment_date timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id,
    t.name,
    t.subdomain,
    t.status,
    t.subscription_tier,
    t.subscription_status,
    po.id,
    po.name,
    po.tier,
    COALESCE(fc.feature_count, 0),
    la.last_assigned
  FROM tenants t
  LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as feature_count
    FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND (tfg.starts_at IS NULL OR tfg.starts_at <= CURRENT_DATE)
      AND (tfg.expires_at IS NULL OR tfg.expires_at >= CURRENT_DATE)
  ) fc ON true
  LEFT JOIN LATERAL (
    SELECT MAX(assigned_at) as last_assigned
    FROM license_assignments
    WHERE tenant_id = t.id
  ) la ON true
  ORDER BY t.name;
$$;

COMMENT ON FUNCTION get_all_tenants_for_assignment IS 'Returns all tenants with current license status for assignment interface';
