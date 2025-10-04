-- Migration: Create Tenant License Summary Materialized View
-- Created: 2025-10-04
-- Description: Creates a materialized view that summarizes tenant licensing state for performance optimization
--              Combines data from tenants, tenant_feature_grants, product_offerings, and v_effective_surface_access

-- =====================================================================================
-- MATERIALIZED VIEW: v_tenant_license_summary
-- =====================================================================================
-- This view provides a high-performance summary of tenant licensing information:
-- - Active license features for the tenant
-- - Surfaces available under the tenant's license
-- - Product offering details (tier, name)
-- - Can be refreshed on-demand or via scheduled job
-- =====================================================================================

CREATE MATERIALIZED VIEW v_tenant_license_summary AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,

  -- Aggregate active license features for this tenant
  COALESCE(
    ARRAY_AGG(DISTINCT tgf.feature_id) FILTER (WHERE tgf.feature_id IS NOT NULL),
    ARRAY[]::uuid[]
  ) AS active_feature_ids,

  -- Aggregate feature codes for easier reference
  COALESCE(
    ARRAY_AGG(DISTINCT fc.code) FILTER (WHERE fc.code IS NOT NULL),
    ARRAY[]::text[]
  ) AS active_feature_codes,

  -- Aggregate licensed surfaces for this tenant
  COALESCE(
    ARRAY_AGG(DISTINCT vesa.surface_id) FILTER (WHERE vesa.surface_id IS NOT NULL),
    ARRAY[]::text[]
  ) AS licensed_surface_ids,

  -- Product offering information
  po.id AS offering_id,
  po.name AS offering_name,
  po.tier AS offering_tier,
  po.description AS offering_description,
  po.is_active AS offering_is_active,

  -- Metadata for tracking
  COUNT(DISTINCT tgf.feature_id) AS feature_count,
  COUNT(DISTINCT vesa.surface_id) AS surface_count,
  NOW() AS refreshed_at

FROM tenants t

-- Join with product offerings (tenant's subscription)
LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id

-- Join with active tenant feature grants
LEFT JOIN tenant_feature_grants tgf ON tgf.tenant_id = t.id
  AND tgf.is_active = true
  AND (tgf.expires_at IS NULL OR tgf.expires_at > NOW())

-- Join with feature catalog to get feature codes
LEFT JOIN feature_catalog fc ON fc.id = tgf.feature_id

-- Join with effective surface access view
LEFT JOIN v_effective_surface_access vesa ON vesa.tenant_id = t.id

-- Only include active tenants
WHERE t.deleted_at IS NULL

GROUP BY
  t.id,
  t.name,
  po.id,
  po.name,
  po.tier,
  po.description,
  po.is_active;

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Primary index on tenant_id for fast lookups
CREATE UNIQUE INDEX idx_tenant_license_summary_tenant_id
  ON v_tenant_license_summary (tenant_id);

-- Index on offering_tier for tier-based queries
CREATE INDEX idx_tenant_license_summary_tier
  ON v_tenant_license_summary (offering_tier);

-- Index on offering_id for offering-based queries
CREATE INDEX idx_tenant_license_summary_offering
  ON v_tenant_license_summary (offering_id);

-- GIN index on active_feature_codes for array containment queries
CREATE INDEX idx_tenant_license_summary_features
  ON v_tenant_license_summary USING GIN (active_feature_codes);

-- GIN index on licensed_surface_ids for array containment queries
CREATE INDEX idx_tenant_license_summary_surfaces
  ON v_tenant_license_summary USING GIN (licensed_surface_ids);

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON MATERIALIZED VIEW v_tenant_license_summary IS
  'Materialized view that summarizes tenant licensing state including active features, licensed surfaces, and product offering details. Optimizes performance for license-aware permission checks. Refresh using: REFRESH MATERIALIZED VIEW CONCURRENTLY v_tenant_license_summary;';

COMMENT ON COLUMN v_tenant_license_summary.tenant_id IS
  'Unique identifier for the tenant';

COMMENT ON COLUMN v_tenant_license_summary.active_feature_ids IS
  'Array of UUIDs representing active license features for this tenant';

COMMENT ON COLUMN v_tenant_license_summary.active_feature_codes IS
  'Array of feature codes (strings) for easier reference and querying';

COMMENT ON COLUMN v_tenant_license_summary.licensed_surface_ids IS
  'Array of surface IDs that this tenant has access to based on their license';

COMMENT ON COLUMN v_tenant_license_summary.offering_tier IS
  'License tier (basic, professional, enterprise, etc.)';

COMMENT ON COLUMN v_tenant_license_summary.feature_count IS
  'Total number of active features for this tenant';

COMMENT ON COLUMN v_tenant_license_summary.surface_count IS
  'Total number of licensed surfaces for this tenant';

COMMENT ON COLUMN v_tenant_license_summary.refreshed_at IS
  'Timestamp when the materialized view was last refreshed';

-- =====================================================================================
-- HELPER FUNCTION: Refresh Tenant License Summary
-- =====================================================================================
-- Provides a convenient function to refresh the materialized view
-- Usage: SELECT refresh_tenant_license_summary();
-- =====================================================================================

CREATE OR REPLACE FUNCTION refresh_tenant_license_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the materialized view concurrently to allow concurrent reads
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_tenant_license_summary;

  -- Log the refresh (optional - can be used for monitoring)
  RAISE NOTICE 'Tenant license summary refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_tenant_license_summary() IS
  'Refreshes the v_tenant_license_summary materialized view concurrently. Use this function in scheduled jobs or after bulk license updates.';

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

-- Grant SELECT permission to authenticated users
GRANT SELECT ON v_tenant_license_summary TO authenticated;

-- Grant EXECUTE permission on refresh function to service role only
GRANT EXECUTE ON FUNCTION refresh_tenant_license_summary() TO service_role;
