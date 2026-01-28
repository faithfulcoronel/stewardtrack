-- =============================================================================
-- Migration: Add missing columns to get_public_product_offerings RPC
-- =============================================================================
-- The get_public_product_offerings function was missing several columns that
-- were added to product_offerings table in recent migrations:
-- - trial_days (20260117100002_add_trial_offering_fields.sql)
-- - max_transactions_per_month (20260117100001_add_financial_transaction_limits.sql)
-- - max_ai_credits_per_month (20260128100010_add_max_ai_credits_to_product_offerings.sql)
--
-- This migration updates the RPC to include all these fields.
-- =============================================================================

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_public_product_offerings(boolean, boolean, text, uuid);

-- Create updated function with all missing columns
CREATE OR REPLACE FUNCTION public.get_public_product_offerings(
  include_features boolean DEFAULT false,
  include_bundles boolean DEFAULT false,
  target_tier text DEFAULT NULL,
  target_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  offering_type text,
  tier text,
  billing_cycle text,
  max_users integer,
  max_tenants integer,
  max_members integer,
  max_sms_per_month integer,
  max_emails_per_month integer,
  max_storage_mb integer,
  max_admin_users integer,
  max_transactions_per_month integer,
  max_ai_credits_per_month integer,
  trial_days integer,
  is_active boolean,
  is_featured boolean,
  sort_order integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  features jsonb,
  bundles jsonb,
  feature_count integer,
  bundle_count integer,
  prices jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    po.max_users,
    po.max_tenants,
    po.max_members,
    po.max_sms_per_month,
    po.max_emails_per_month,
    po.max_storage_mb,
    po.max_admin_users,
    po.max_transactions_per_month,
    po.max_ai_credits_per_month,
    po.trial_days,
    po.is_active,
    po.is_featured,
    po.sort_order,
    po.metadata,
    po.created_at,
    po.updated_at,
    -- Features
    CASE
      WHEN include_features THEN (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', fc.id,
              'code', fc.code,
              'name', fc.name,
              'category', fc.category,
              'is_required', pof.is_required
            )
            ORDER BY fc.name
          ),
          '[]'::jsonb
        )
        FROM product_offering_features pof
        JOIN feature_catalog fc ON fc.id = pof.feature_id
        WHERE pof.offering_id = po.id
          AND fc.deleted_at IS NULL
          AND fc.is_active IS DISTINCT FROM false
      )
      ELSE '[]'::jsonb
    END AS features,
    -- Bundles
    CASE
      WHEN include_bundles THEN (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', lfb.id,
              'code', lfb.code,
              'name', lfb.name,
              'bundle_type', lfb.bundle_type,
              'category', lfb.category,
              'is_required', pob.is_required,
              'display_order', pob.display_order,
              'feature_count', (
                SELECT COUNT(*)::integer
                FROM license_feature_bundle_items lfbi
                WHERE lfbi.bundle_id = lfb.id
              )
            )
            ORDER BY pob.display_order, lfb.name
          ),
          '[]'::jsonb
        )
        FROM product_offering_bundles pob
        JOIN license_feature_bundles lfb ON lfb.id = pob.bundle_id
        WHERE pob.offering_id = po.id
          AND lfb.deleted_at IS NULL
          AND lfb.is_active IS DISTINCT FROM false
      )
      ELSE '[]'::jsonb
    END AS bundles,
    -- Feature count
    CASE
      WHEN include_features OR include_bundles THEN (
        SELECT COUNT(*)::integer
        FROM get_offering_all_features(po.id)
      )
      ELSE NULL
    END AS feature_count,
    -- Bundle count
    CASE
      WHEN include_bundles THEN (
        SELECT COUNT(*)::integer
        FROM product_offering_bundles pob
        WHERE pob.offering_id = po.id
      )
      ELSE NULL
    END AS bundle_count,
    -- Prices from product_offering_prices table (PHP first, then alphabetically)
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', pop.id,
            'currency', pop.currency,
            'price', pop.price,
            'is_active', pop.is_active
          )
          ORDER BY
            CASE WHEN pop.currency = 'PHP' THEN 0 ELSE 1 END,
            pop.currency
        ),
        '[]'::jsonb
      )
      FROM product_offering_prices pop
      WHERE pop.offering_id = po.id
        AND pop.is_active = true
    ) AS prices
  FROM product_offerings po
  WHERE po.is_active = true
    AND po.deleted_at IS NULL
    AND (target_tier IS NULL OR po.tier = target_tier)
    AND (target_id IS NULL OR po.id = target_id)
  ORDER BY po.sort_order, po.name;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.get_public_product_offerings(boolean, boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_offerings(boolean, boolean, text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_product_offerings(boolean, boolean, text, uuid)
  IS 'Returns active product offerings with all tier limits (members, SMS, emails, storage, admin users, transactions, AI credits), trial_days, and prices for multi-currency support.';

COMMIT;
