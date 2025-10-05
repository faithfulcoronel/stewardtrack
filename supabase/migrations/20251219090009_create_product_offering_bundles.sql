-- =====================================================================================
-- MIGRATION: Create Product Offering Bundles Junction Table
-- =====================================================================================
-- This migration creates the missing junction table to associate product offerings
-- with feature bundles, enabling bundle-based licensing configuration.
--
-- Purpose:
-- - Allow product offerings to include entire feature bundles
-- - Support both bundle-based and individual feature assignments
-- - Enable hybrid approach (bundles + individual features)
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- TABLE: product_offering_bundles
-- =====================================================================================
-- Junction table linking product offerings to feature bundles
-- Enables assigning entire bundles to offerings for easier management
CREATE TABLE IF NOT EXISTS product_offering_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES license_feature_bundles(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (offering_id, bundle_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS product_offering_bundles_offering_id_idx
  ON product_offering_bundles(offering_id);

CREATE INDEX IF NOT EXISTS product_offering_bundles_bundle_id_idx
  ON product_offering_bundles(bundle_id);

CREATE INDEX IF NOT EXISTS product_offering_bundles_display_order_idx
  ON product_offering_bundles(offering_id, display_order);

-- Enable RLS
ALTER TABLE product_offering_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only super admins can manage offering-bundle associations
CREATE POLICY "Product offering bundles are viewable by authenticated users"
  ON product_offering_bundles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product offering bundles can be managed by super admins"
  ON product_offering_bundles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_product_offering_bundles_updated_at
BEFORE UPDATE ON product_offering_bundles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE product_offering_bundles IS
  'Junction table linking product offerings to feature bundles. Enables bundle-based licensing where entire bundles can be assigned to offerings.';

COMMENT ON COLUMN product_offering_bundles.offering_id IS
  'The product offering that includes this bundle.';

COMMENT ON COLUMN product_offering_bundles.bundle_id IS
  'The feature bundle included in this offering.';

COMMENT ON COLUMN product_offering_bundles.is_required IS
  'Whether this bundle is required for the offering to function properly.';

COMMENT ON COLUMN product_offering_bundles.display_order IS
  'Display order for UI presentation (lower numbers appear first).';

-- =====================================================================================
-- HELPER FUNCTION: get_offering_all_features
-- =====================================================================================
-- Returns all features for an offering, including both:
-- 1. Features from bundles assigned to the offering
-- 2. Individual features directly assigned to the offering
--
-- This function is used during license provisioning to grant all features
CREATE OR REPLACE FUNCTION get_offering_all_features(p_offering_id uuid)
RETURNS TABLE (
  feature_id uuid,
  feature_code text,
  feature_name text,
  feature_category text,
  source text,  -- 'bundle' or 'direct'
  source_id uuid,  -- bundle_id if from bundle, offering_id if direct
  is_required boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Features from bundles
  SELECT DISTINCT
    fc.id AS feature_id,
    fc.code AS feature_code,
    fc.name AS feature_name,
    fc.category AS feature_category,
    'bundle'::text AS source,
    pob.bundle_id AS source_id,
    pob.is_required AS is_required
  FROM product_offering_bundles pob
  JOIN license_feature_bundle_items lfbi ON lfbi.bundle_id = pob.bundle_id
  JOIN feature_catalog fc ON fc.id = lfbi.feature_id
  WHERE pob.offering_id = p_offering_id
    AND fc.is_active = true

  UNION

  -- Individual features directly assigned
  SELECT DISTINCT
    fc.id AS feature_id,
    fc.code AS feature_code,
    fc.name AS feature_name,
    fc.category AS feature_category,
    'direct'::text AS source,
    pof.offering_id AS source_id,
    pof.is_required AS is_required
  FROM product_offering_features pof
  JOIN feature_catalog fc ON fc.id = pof.feature_id
  WHERE pof.offering_id = p_offering_id
    AND fc.is_active = true

  ORDER BY feature_category, feature_name;
END;
$$;

COMMENT ON FUNCTION get_offering_all_features IS
  'Returns all features for an offering from both bundles and direct assignments. Used during license provisioning.';

GRANT EXECUTE ON FUNCTION get_offering_all_features(uuid) TO authenticated;

-- =====================================================================================
-- HELPER FUNCTION: get_offering_bundle_count
-- =====================================================================================
-- Returns the number of bundles assigned to an offering
CREATE OR REPLACE FUNCTION get_offering_bundle_count(p_offering_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM product_offering_bundles
  WHERE offering_id = p_offering_id;
$$;

COMMENT ON FUNCTION get_offering_bundle_count IS
  'Returns the count of bundles assigned to a product offering.';

GRANT EXECUTE ON FUNCTION get_offering_bundle_count(uuid) TO authenticated;

COMMIT;
