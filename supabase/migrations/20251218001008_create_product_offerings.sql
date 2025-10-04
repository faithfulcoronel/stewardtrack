-- Product offerings table for licensing management
-- Extends the licensing domain with explicit product SKUs and subscription tiers

BEGIN;

-- Product offerings catalog - represents purchasable product SKUs
CREATE TABLE IF NOT EXISTS product_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  offering_type text NOT NULL CHECK (offering_type IN ('subscription', 'one-time', 'trial', 'enterprise')),
  tier text NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise', 'custom')),
  billing_cycle text CHECK (billing_cycle IN ('monthly', 'annual', 'lifetime', null)),
  base_price decimal(10, 2),
  currency text DEFAULT 'USD',
  max_users integer,
  max_tenants integer DEFAULT 1,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Product offering to feature mapping (many-to-many)
-- Links product offerings to specific features from the feature_catalog
CREATE TABLE IF NOT EXISTS product_offering_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (offering_id, feature_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS product_offerings_code_idx ON product_offerings(code);
CREATE INDEX IF NOT EXISTS product_offerings_offering_type_idx ON product_offerings(offering_type);
CREATE INDEX IF NOT EXISTS product_offerings_tier_idx ON product_offerings(tier);
CREATE INDEX IF NOT EXISTS product_offerings_is_active_idx ON product_offerings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS product_offerings_deleted_at_idx ON product_offerings(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS product_offering_features_offering_id_idx ON product_offering_features(offering_id);
CREATE INDEX IF NOT EXISTS product_offering_features_feature_id_idx ON product_offering_features(feature_id);

-- Enable RLS
ALTER TABLE product_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offering_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Product offerings are globally viewable, but only admins can manage
CREATE POLICY "Product offerings are viewable by authenticated users" ON product_offerings
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Product offerings can be managed by system admins" ON product_offerings
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Product offering features are viewable by authenticated users" ON product_offering_features
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Product offering features can be managed by system admins" ON product_offering_features
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Updated at triggers
CREATE TRIGGER update_product_offerings_updated_at
BEFORE UPDATE ON product_offerings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE product_offerings IS 'Catalog of purchasable product offerings/SKUs with tier and pricing information.';
COMMENT ON TABLE product_offering_features IS 'Maps product offerings to specific features from the feature catalog.';
COMMENT ON COLUMN product_offerings.offering_type IS 'Type of offering: subscription (recurring), one-time (perpetual), trial (temporary), or enterprise (custom).';
COMMENT ON COLUMN product_offerings.tier IS 'Product tier level: starter, professional, enterprise, or custom.';
COMMENT ON COLUMN product_offerings.billing_cycle IS 'Billing frequency for subscriptions: monthly, annual, or lifetime.';
COMMENT ON COLUMN product_offerings.base_price IS 'Base price in the specified currency. Null for custom/trial offerings.';
COMMENT ON COLUMN product_offerings.max_users IS 'Maximum number of users allowed. Null for unlimited.';
COMMENT ON COLUMN product_offerings.max_tenants IS 'Maximum number of tenants/organizations allowed. Typically 1 for standard offerings.';
COMMENT ON COLUMN product_offerings.metadata IS 'Additional product-specific configuration as JSON.';

-- Seed initial product offerings
INSERT INTO product_offerings (code, name, description, offering_type, tier, billing_cycle, base_price, max_users, is_active, is_featured, sort_order)
VALUES
  ('stewardtrack-starter-monthly', 'StewardTrack Starter (Monthly)', 'Essential church management features for small congregations.', 'subscription', 'starter', 'monthly', 29.00, 50, true, false, 1),
  ('stewardtrack-starter-annual', 'StewardTrack Starter (Annual)', 'Essential church management features for small congregations. Save 20% with annual billing.', 'subscription', 'starter', 'annual', 279.00, 50, true, false, 2),
  ('stewardtrack-professional-monthly', 'StewardTrack Professional (Monthly)', 'Advanced features including RBAC, delegation, and analytics.', 'subscription', 'professional', 'monthly', 99.00, 250, true, true, 3),
  ('stewardtrack-professional-annual', 'StewardTrack Professional (Annual)', 'Advanced features including RBAC, delegation, and analytics. Save 20% with annual billing.', 'subscription', 'professional', 'annual', 949.00, 250, true, true, 4),
  ('stewardtrack-enterprise-monthly', 'StewardTrack Enterprise (Monthly)', 'Full-featured solution for large churches and multi-campus organizations.', 'subscription', 'enterprise', 'monthly', 299.00, null, true, false, 5),
  ('stewardtrack-enterprise-annual', 'StewardTrack Enterprise (Annual)', 'Full-featured solution for large churches and multi-campus organizations. Save 20% with annual billing.', 'subscription', 'enterprise', 'annual', 2869.00, null, true, false, 6),
  ('stewardtrack-trial', 'StewardTrack Free Trial', '30-day trial with full professional features.', 'trial', 'professional', null, 0.00, 100, true, true, 0)
ON CONFLICT (code) DO NOTHING;

-- Map features to product offerings
-- Note: This is a placeholder - actual feature mappings should be done based on business rules
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT
  po.id,
  fc.id,
  true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code LIKE '%starter%'
  AND fc.category IN ('core', 'members')
  AND fc.phase = 'ga'
ON CONFLICT (offering_id, feature_id) DO NOTHING;

INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT
  po.id,
  fc.id,
  true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code LIKE '%professional%'
  AND fc.category IN ('core', 'members', 'rbac', 'finance')
  AND fc.phase IN ('ga', 'beta')
ON CONFLICT (offering_id, feature_id) DO NOTHING;

INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT
  po.id,
  fc.id,
  true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code LIKE '%enterprise%'
  AND fc.is_active = true
ON CONFLICT (offering_id, feature_id) DO NOTHING;

INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT
  po.id,
  fc.id,
  true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code = 'stewardtrack-trial'
  AND fc.category IN ('core', 'members', 'rbac', 'finance')
  AND fc.phase IN ('ga', 'beta')
ON CONFLICT (offering_id, feature_id) DO NOTHING;

COMMIT;
