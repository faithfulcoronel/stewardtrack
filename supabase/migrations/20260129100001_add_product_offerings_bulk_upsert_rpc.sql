-- =============================================================================
-- Migration: Add Product Offerings Bulk Upsert RPC
-- =============================================================================
-- This migration creates an RPC function for bulk upserting product offerings
-- Used by the Excel import feature in the Licensing Studio.
--
-- Features:
-- - Process multiple offerings in a single transaction
-- - Upsert core offering fields (match by code)
-- - Sync feature associations via junction table
-- - Sync bundle associations via junction table
-- - Upsert multi-currency prices
-- - Return detailed success/error results per row
-- =============================================================================

BEGIN;

-- =============================================================================
-- FUNCTION: bulk_upsert_product_offerings
-- =============================================================================
-- Processes an array of product offerings and their related data in one transaction.
--
-- Input JSONB structure for each offering:
-- {
--   "code": "offering-code",
--   "name": "Offering Name",
--   "description": "...",
--   "offering_type": "subscription",
--   "tier": "premium",
--   "billing_cycle": "monthly",
--   "max_members": 100,
--   "max_admin_users": 5,
--   "max_sms_per_month": 50,
--   "max_emails_per_month": 500,
--   "max_storage_mb": 500,
--   "max_transactions_per_month": 1000,
--   "max_ai_credits_per_month": 100,
--   "trial_days": 14,
--   "is_active": true,
--   "is_featured": false,
--   "sort_order": 100,
--   "feature_codes": ["feature.code1", "feature.code2"],
--   "bundle_codes": ["bundle-code1", "bundle-code2"],
--   "prices": { "PHP": 499, "USD": 9 }
-- }
--
-- Returns:
-- {
--   "success": true,
--   "processed": 5,
--   "created": 2,
--   "updated": 3,
--   "errors": [],
--   "results": [
--     { "code": "...", "status": "created" },
--     { "code": "...", "status": "updated" },
--     { "code": "...", "status": "error", "error": "Invalid tier value" }
--   ]
-- }
-- =============================================================================

CREATE OR REPLACE FUNCTION bulk_upsert_product_offerings(
  p_offerings JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offering JSONB;
  v_result JSONB := '{"success": true, "processed": 0, "created": 0, "updated": 0, "errors": [], "results": []}'::jsonb;
  v_offering_id UUID;
  v_is_new BOOLEAN;
  v_code TEXT;
  v_feature_codes TEXT[];
  v_bundle_codes TEXT[];
  v_prices JSONB;
  v_feature_id UUID;
  v_bundle_id UUID;
  v_currency TEXT;
  v_price NUMERIC;
  v_error_msg TEXT;
  v_row_result JSONB;
BEGIN
  -- Validate input
  IF p_offerings IS NULL OR jsonb_typeof(p_offerings) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Input must be a JSONB array of offerings'
    );
  END IF;

  -- Process each offering
  FOR v_offering IN SELECT * FROM jsonb_array_elements(p_offerings)
  LOOP
    BEGIN
      v_code := v_offering->>'code';
      v_is_new := false;
      v_row_result := jsonb_build_object('code', v_code);

      -- Validate required fields
      IF v_code IS NULL OR v_code = '' THEN
        v_row_result := v_row_result || jsonb_build_object('status', 'error', 'error', 'Code is required');
        v_result := jsonb_set(v_result, '{results}', v_result->'results' || jsonb_build_array(v_row_result));
        v_result := jsonb_set(v_result, '{errors}', v_result->'errors' || jsonb_build_array(jsonb_build_object('code', v_code, 'error', 'Code is required')));
        CONTINUE;
      END IF;

      -- Check if offering exists
      SELECT id INTO v_offering_id
      FROM product_offerings
      WHERE code = v_code AND deleted_at IS NULL;

      IF v_offering_id IS NULL THEN
        v_is_new := true;
      END IF;

      -- Upsert the offering
      INSERT INTO product_offerings (
        id,
        code,
        name,
        description,
        offering_type,
        tier,
        billing_cycle,
        max_users,
        max_tenants,
        max_members,
        max_admin_users,
        max_sms_per_month,
        max_emails_per_month,
        max_storage_mb,
        max_transactions_per_month,
        max_ai_credits_per_month,
        trial_days,
        is_active,
        is_featured,
        sort_order,
        metadata,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      VALUES (
        COALESCE(v_offering_id, gen_random_uuid()),
        v_code,
        COALESCE(v_offering->>'name', v_code),
        v_offering->>'description',
        COALESCE(v_offering->>'offering_type', 'subscription'),
        COALESCE(v_offering->>'tier', 'premium'),
        v_offering->>'billing_cycle',
        (v_offering->>'max_users')::INTEGER,
        COALESCE((v_offering->>'max_tenants')::INTEGER, 1),
        (v_offering->>'max_members')::INTEGER,
        (v_offering->>'max_admin_users')::INTEGER,
        (v_offering->>'max_sms_per_month')::INTEGER,
        (v_offering->>'max_emails_per_month')::INTEGER,
        (v_offering->>'max_storage_mb')::INTEGER,
        (v_offering->>'max_transactions_per_month')::INTEGER,
        (v_offering->>'max_ai_credits_per_month')::INTEGER,
        (v_offering->>'trial_days')::INTEGER,
        COALESCE((v_offering->>'is_active')::BOOLEAN, true),
        COALESCE((v_offering->>'is_featured')::BOOLEAN, false),
        COALESCE((v_offering->>'sort_order')::INTEGER, 0),
        COALESCE(v_offering->'metadata', '{}'::jsonb),
        p_user_id,
        p_user_id,
        COALESCE((SELECT created_at FROM product_offerings WHERE id = v_offering_id), now()),
        now()
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        offering_type = EXCLUDED.offering_type,
        tier = EXCLUDED.tier,
        billing_cycle = EXCLUDED.billing_cycle,
        max_users = EXCLUDED.max_users,
        max_tenants = EXCLUDED.max_tenants,
        max_members = EXCLUDED.max_members,
        max_admin_users = EXCLUDED.max_admin_users,
        max_sms_per_month = EXCLUDED.max_sms_per_month,
        max_emails_per_month = EXCLUDED.max_emails_per_month,
        max_storage_mb = EXCLUDED.max_storage_mb,
        max_transactions_per_month = EXCLUDED.max_transactions_per_month,
        max_ai_credits_per_month = EXCLUDED.max_ai_credits_per_month,
        trial_days = EXCLUDED.trial_days,
        is_active = EXCLUDED.is_active,
        is_featured = EXCLUDED.is_featured,
        sort_order = EXCLUDED.sort_order,
        metadata = COALESCE(EXCLUDED.metadata, product_offerings.metadata),
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      RETURNING id INTO v_offering_id;

      -- Process feature codes if provided
      IF v_offering ? 'feature_codes' AND jsonb_typeof(v_offering->'feature_codes') = 'array' THEN
        -- Delete existing feature associations
        DELETE FROM product_offering_features WHERE offering_id = v_offering_id;

        -- Insert new feature associations
        FOR v_feature_id IN
          SELECT fc.id
          FROM jsonb_array_elements_text(v_offering->'feature_codes') AS fc_code
          JOIN feature_catalog fc ON fc.code = fc_code AND fc.deleted_at IS NULL
        LOOP
          INSERT INTO product_offering_features (offering_id, feature_id, is_required)
          VALUES (v_offering_id, v_feature_id, true)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      -- Process bundle codes if provided
      IF v_offering ? 'bundle_codes' AND jsonb_typeof(v_offering->'bundle_codes') = 'array' THEN
        -- Delete existing bundle associations
        DELETE FROM product_offering_bundles WHERE offering_id = v_offering_id;

        -- Insert new bundle associations
        FOR v_bundle_id IN
          SELECT lfb.id
          FROM jsonb_array_elements_text(v_offering->'bundle_codes') AS b_code
          JOIN license_feature_bundles lfb ON lfb.code = b_code
        LOOP
          INSERT INTO product_offering_bundles (offering_id, bundle_id, is_required)
          VALUES (v_offering_id, v_bundle_id, true)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      -- Process prices if provided
      IF v_offering ? 'prices' AND jsonb_typeof(v_offering->'prices') = 'object' THEN
        v_prices := v_offering->'prices';

        -- Iterate through each currency in the prices object
        FOR v_currency, v_price IN
          SELECT key, value::NUMERIC
          FROM jsonb_each_text(v_prices)
        LOOP
          -- Upsert the price
          INSERT INTO product_offering_prices (
            offering_id,
            currency,
            price,
            is_active,
            created_by,
            updated_by,
            created_at,
            updated_at
          )
          VALUES (
            v_offering_id,
            v_currency,
            v_price,
            true,
            p_user_id,
            p_user_id,
            now(),
            now()
          )
          ON CONFLICT (offering_id, currency) DO UPDATE SET
            price = EXCLUDED.price,
            is_active = true,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at;
        END LOOP;
      END IF;

      -- Update result counters
      v_result := jsonb_set(v_result, '{processed}', to_jsonb((v_result->>'processed')::INTEGER + 1));

      IF v_is_new THEN
        v_result := jsonb_set(v_result, '{created}', to_jsonb((v_result->>'created')::INTEGER + 1));
        v_row_result := v_row_result || jsonb_build_object('status', 'created', 'id', v_offering_id);
      ELSE
        v_result := jsonb_set(v_result, '{updated}', to_jsonb((v_result->>'updated')::INTEGER + 1));
        v_row_result := v_row_result || jsonb_build_object('status', 'updated', 'id', v_offering_id);
      END IF;

      v_result := jsonb_set(v_result, '{results}', v_result->'results' || jsonb_build_array(v_row_result));

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      v_row_result := v_row_result || jsonb_build_object('status', 'error', 'error', v_error_msg);
      v_result := jsonb_set(v_result, '{results}', v_result->'results' || jsonb_build_array(v_row_result));
      v_result := jsonb_set(v_result, '{errors}', v_result->'errors' || jsonb_build_array(jsonb_build_object('code', v_code, 'error', v_error_msg)));
      v_result := jsonb_set(v_result, '{processed}', to_jsonb((v_result->>'processed')::INTEGER + 1));
    END;
  END LOOP;

  -- Set success to false if there were any errors
  IF jsonb_array_length(v_result->'errors') > 0 THEN
    v_result := jsonb_set(v_result, '{success}', 'false'::jsonb);
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_upsert_product_offerings(JSONB, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION bulk_upsert_product_offerings IS
'Bulk upsert product offerings with features, bundles, and prices.
Used by the Excel import feature in the Licensing Studio.
Processes all offerings in a single transaction for atomicity.';

-- =============================================================================
-- FUNCTION: get_all_product_offerings_for_export
-- =============================================================================
-- Returns all product offerings with their features, bundles, and prices
-- in a format suitable for Excel export.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_all_product_offerings_for_export()
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  offering_type TEXT,
  tier TEXT,
  billing_cycle TEXT,
  max_members INTEGER,
  max_admin_users INTEGER,
  max_sms_per_month INTEGER,
  max_emails_per_month INTEGER,
  max_storage_mb INTEGER,
  max_transactions_per_month INTEGER,
  max_ai_credits_per_month INTEGER,
  trial_days INTEGER,
  is_active BOOLEAN,
  is_featured BOOLEAN,
  sort_order INTEGER,
  metadata JSONB,
  feature_codes TEXT,
  bundle_codes TEXT,
  price_php NUMERIC,
  price_usd NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id,
    po.code,
    po.name,
    po.description,
    po.offering_type,
    po.tier,
    po.billing_cycle,
    po.max_members,
    po.max_admin_users,
    po.max_sms_per_month,
    po.max_emails_per_month,
    po.max_storage_mb,
    po.max_transactions_per_month,
    po.max_ai_credits_per_month,
    po.trial_days,
    po.is_active,
    po.is_featured,
    po.sort_order,
    po.metadata,
    -- Aggregate feature codes as comma-separated string
    (
      SELECT STRING_AGG(fc.code, ', ' ORDER BY fc.code)
      FROM product_offering_features pof
      JOIN feature_catalog fc ON fc.id = pof.feature_id
      WHERE pof.offering_id = po.id AND fc.deleted_at IS NULL
    ) AS feature_codes,
    -- Aggregate bundle codes as comma-separated string
    (
      SELECT STRING_AGG(lfb.code, ', ' ORDER BY lfb.code)
      FROM product_offering_bundles pob
      JOIN license_feature_bundles lfb ON lfb.id = pob.bundle_id
      WHERE pob.offering_id = po.id
    ) AS bundle_codes,
    -- Get PHP price
    (
      SELECT pop.price
      FROM product_offering_prices pop
      WHERE pop.offering_id = po.id AND pop.currency = 'PHP' AND pop.is_active = true
      LIMIT 1
    ) AS price_php,
    -- Get USD price
    (
      SELECT pop.price
      FROM product_offering_prices pop
      WHERE pop.offering_id = po.id AND pop.currency = 'USD' AND pop.is_active = true
      LIMIT 1
    ) AS price_usd,
    po.created_at,
    po.updated_at
  FROM product_offerings po
  WHERE po.deleted_at IS NULL
  ORDER BY po.sort_order, po.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_product_offerings_for_export() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_product_offerings_for_export IS
'Returns all product offerings with features, bundles, and prices for Excel export.
Used by the export feature in the Licensing Studio.';

-- =============================================================================
-- Verify migration success
-- =============================================================================

DO $$
BEGIN
  -- Verify bulk_upsert_product_offerings function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'bulk_upsert_product_offerings'
  ) THEN
    RAISE EXCEPTION 'bulk_upsert_product_offerings function was not created';
  END IF;

  -- Verify get_all_product_offerings_for_export function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_all_product_offerings_for_export'
  ) THEN
    RAISE EXCEPTION 'get_all_product_offerings_for_export function was not created';
  END IF;

  RAISE NOTICE 'Product offerings bulk upsert RPC migration completed successfully';
END $$;

COMMIT;
