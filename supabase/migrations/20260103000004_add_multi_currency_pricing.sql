-- =====================================================================================
-- MIGRATION: Add Multi-Currency Pricing Support
-- =====================================================================================
-- Enables product offerings to have prices in multiple currencies.
-- Supports geo-based currency detection and admin currency configuration.
--
-- Strategy:
--   1. Keep base_price and currency in product_offerings as the DEFAULT price
--   2. Add product_offering_prices table for currency-specific pricing
--   3. Add currency_configurations table for admin settings
--   4. Update tenants.currency to use validated currency codes
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- STEP 1: Create supported currencies reference table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS supported_currencies (
  code varchar(3) PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  symbol_position varchar(10) NOT NULL DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
  decimal_places smallint NOT NULL DEFAULT 2,
  locale text NOT NULL,
  region text NOT NULL,
  xendit_supported boolean DEFAULT false,
  min_amount decimal(15, 2) DEFAULT 1,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comment
COMMENT ON TABLE supported_currencies IS 'Reference table for all supported currencies with formatting information';
COMMENT ON COLUMN supported_currencies.code IS 'ISO 4217 currency code (e.g., PHP, USD, EUR)';
COMMENT ON COLUMN supported_currencies.xendit_supported IS 'Whether Xendit can process payments in this currency';
COMMENT ON COLUMN supported_currencies.min_amount IS 'Minimum transaction amount in this currency';

-- Seed supported currencies
INSERT INTO supported_currencies (code, name, symbol, symbol_position, decimal_places, locale, region, xendit_supported, min_amount, sort_order)
VALUES
  -- Primary Market - Philippines
  ('PHP', 'Philippine Peso', '₱', 'before', 2, 'en-PH', 'philippines', true, 100, 1),

  -- Southeast Asia
  ('IDR', 'Indonesian Rupiah', 'Rp', 'before', 0, 'id-ID', 'southeast_asia', true, 10000, 2),
  ('SGD', 'Singapore Dollar', 'S$', 'before', 2, 'en-SG', 'southeast_asia', false, 1, 3),
  ('MYR', 'Malaysian Ringgit', 'RM', 'before', 2, 'ms-MY', 'southeast_asia', false, 1, 4),
  ('THB', 'Thai Baht', '฿', 'before', 2, 'th-TH', 'southeast_asia', false, 20, 5),
  ('VND', 'Vietnamese Dong', '₫', 'after', 0, 'vi-VN', 'southeast_asia', false, 10000, 6),

  -- Global/Default
  ('USD', 'US Dollar', '$', 'before', 2, 'en-US', 'americas', true, 1, 10),
  ('EUR', 'Euro', '€', 'before', 2, 'de-DE', 'europe', true, 1, 11),
  ('GBP', 'British Pound', '£', 'before', 2, 'en-GB', 'europe', true, 1, 12),
  ('AUD', 'Australian Dollar', 'A$', 'before', 2, 'en-AU', 'oceania', true, 1, 13),
  ('CAD', 'Canadian Dollar', 'C$', 'before', 2, 'en-CA', 'americas', true, 1, 14),

  -- East Asia
  ('JPY', 'Japanese Yen', '¥', 'before', 0, 'ja-JP', 'east_asia', true, 100, 20),
  ('KRW', 'South Korean Won', '₩', 'before', 0, 'ko-KR', 'east_asia', false, 1000, 21),
  ('HKD', 'Hong Kong Dollar', 'HK$', 'before', 2, 'zh-HK', 'east_asia', false, 1, 22),
  ('TWD', 'Taiwan Dollar', 'NT$', 'before', 0, 'zh-TW', 'east_asia', false, 30, 23),

  -- South Asia
  ('INR', 'Indian Rupee', '₹', 'before', 2, 'en-IN', 'south_asia', false, 1, 30),

  -- Europe
  ('CHF', 'Swiss Franc', 'CHF', 'before', 2, 'de-CH', 'europe', false, 1, 40),

  -- Oceania
  ('NZD', 'New Zealand Dollar', 'NZ$', 'before', 2, 'en-NZ', 'oceania', false, 1, 41)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  xendit_supported = EXCLUDED.xendit_supported,
  updated_at = now();

-- Enable RLS
ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;

-- Everyone can read currencies
CREATE POLICY "Supported currencies are publicly readable"
  ON supported_currencies FOR SELECT
  USING (true);

-- Only super admins can modify
CREATE POLICY "Only super admins can modify currencies"
  ON supported_currencies FOR ALL
  TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- =====================================================================================
-- STEP 2: Create product offering prices table for multi-currency
-- =====================================================================================

CREATE TABLE IF NOT EXISTS product_offering_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  currency varchar(3) NOT NULL REFERENCES supported_currencies(code),
  price decimal(15, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One price per offering per currency
  UNIQUE (offering_id, currency)
);

-- Indexes
CREATE INDEX IF NOT EXISTS product_offering_prices_offering_id_idx ON product_offering_prices(offering_id);
CREATE INDEX IF NOT EXISTS product_offering_prices_currency_idx ON product_offering_prices(currency);
CREATE INDEX IF NOT EXISTS product_offering_prices_active_idx ON product_offering_prices(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE product_offering_prices IS 'Multi-currency pricing for product offerings. Each offering can have different prices in different currencies.';
COMMENT ON COLUMN product_offering_prices.price IS 'Price in the specified currency. Stored in major units (e.g., 29.00 USD, 1500 PHP)';

-- Enable RLS
ALTER TABLE product_offering_prices ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active prices
CREATE POLICY "Product offering prices are viewable by authenticated"
  ON product_offering_prices FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Super admins can manage all prices
CREATE POLICY "Super admins can manage product offering prices"
  ON product_offering_prices FOR ALL
  TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Trigger for updated_at
CREATE TRIGGER update_product_offering_prices_updated_at
BEFORE UPDATE ON product_offering_prices
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================================
-- STEP 3: Create country to currency mapping table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS country_currency_mappings (
  country_code varchar(2) PRIMARY KEY,
  country_name text NOT NULL,
  currency_code varchar(3) NOT NULL REFERENCES supported_currencies(code),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments
COMMENT ON TABLE country_currency_mappings IS 'Maps countries (ISO 3166-1 alpha-2) to their default currencies';

-- Seed country mappings
INSERT INTO country_currency_mappings (country_code, country_name, currency_code)
VALUES
  -- Philippines
  ('PH', 'Philippines', 'PHP'),

  -- Southeast Asia
  ('ID', 'Indonesia', 'IDR'),
  ('SG', 'Singapore', 'SGD'),
  ('MY', 'Malaysia', 'MYR'),
  ('TH', 'Thailand', 'THB'),
  ('VN', 'Vietnam', 'VND'),

  -- East Asia
  ('JP', 'Japan', 'JPY'),
  ('KR', 'South Korea', 'KRW'),
  ('HK', 'Hong Kong', 'HKD'),
  ('TW', 'Taiwan', 'TWD'),
  ('CN', 'China', 'USD'),

  -- South Asia
  ('IN', 'India', 'INR'),

  -- Oceania
  ('AU', 'Australia', 'AUD'),
  ('NZ', 'New Zealand', 'NZD'),

  -- Europe
  ('GB', 'United Kingdom', 'GBP'),
  ('DE', 'Germany', 'EUR'),
  ('FR', 'France', 'EUR'),
  ('IT', 'Italy', 'EUR'),
  ('ES', 'Spain', 'EUR'),
  ('NL', 'Netherlands', 'EUR'),
  ('BE', 'Belgium', 'EUR'),
  ('AT', 'Austria', 'EUR'),
  ('PT', 'Portugal', 'EUR'),
  ('IE', 'Ireland', 'EUR'),
  ('GR', 'Greece', 'EUR'),
  ('FI', 'Finland', 'EUR'),
  ('CH', 'Switzerland', 'CHF'),

  -- Americas
  ('US', 'United States', 'USD'),
  ('CA', 'Canada', 'CAD'),
  ('MX', 'Mexico', 'USD'),
  ('BR', 'Brazil', 'USD'),
  ('AR', 'Argentina', 'USD')
ON CONFLICT (country_code) DO UPDATE SET
  country_name = EXCLUDED.country_name,
  currency_code = EXCLUDED.currency_code,
  updated_at = now();

-- Enable RLS
ALTER TABLE country_currency_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can read mappings
CREATE POLICY "Country currency mappings are publicly readable"
  ON country_currency_mappings FOR SELECT
  USING (true);

-- Only super admins can modify
CREATE POLICY "Only super admins can modify country mappings"
  ON country_currency_mappings FOR ALL
  TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- =====================================================================================
-- STEP 4: Update tenants.currency to reference supported_currencies
-- =====================================================================================

-- First ensure all existing currency values are valid
-- Default to PHP for Philippine-based tenants (primary market)
UPDATE tenants
SET currency = 'PHP'
WHERE currency IS NULL OR currency NOT IN (SELECT code FROM supported_currencies);

-- Add foreign key constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_currency_fkey'
    AND table_name = 'tenants'
  ) THEN
    ALTER TABLE tenants
    ADD CONSTRAINT tenants_currency_fkey
    FOREIGN KEY (currency) REFERENCES supported_currencies(code);
  END IF;
END $$;

-- =====================================================================================
-- STEP 5: Add currency to subscription_payments if not exists
-- =====================================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments' AND column_name = 'original_currency'
  ) THEN
    ALTER TABLE subscription_payments ADD COLUMN original_currency varchar(3);
    ALTER TABLE subscription_payments ADD COLUMN original_amount decimal(15, 2);

    COMMENT ON COLUMN subscription_payments.original_currency IS 'Original currency the customer paid in';
    COMMENT ON COLUMN subscription_payments.original_amount IS 'Original amount in customer currency before any conversion';
  END IF;
END $$;

-- =====================================================================================
-- STEP 6: Create helper functions
-- =====================================================================================

-- Function to get price for offering in specific currency
CREATE OR REPLACE FUNCTION get_offering_price(
  p_offering_id uuid,
  p_currency varchar(3)
)
RETURNS decimal(15, 2) AS $$
DECLARE
  v_price decimal(15, 2);
  v_base_price decimal(15, 2);
  v_base_currency varchar(3);
BEGIN
  -- First try to get currency-specific price
  SELECT price INTO v_price
  FROM product_offering_prices
  WHERE offering_id = p_offering_id
    AND currency = p_currency
    AND is_active = true;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- Fall back to base price from product_offerings
  SELECT base_price, COALESCE(currency, 'USD') INTO v_base_price, v_base_currency
  FROM product_offerings
  WHERE id = p_offering_id
    AND deleted_at IS NULL;

  -- If requested currency matches base currency, return base price
  IF v_base_currency = p_currency THEN
    RETURN v_base_price;
  END IF;

  -- No price available for this currency
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get currency for country
CREATE OR REPLACE FUNCTION get_currency_for_country(p_country_code varchar(2))
RETURNS varchar(3) AS $$
DECLARE
  v_currency varchar(3);
BEGIN
  SELECT currency_code INTO v_currency
  FROM country_currency_mappings
  WHERE country_code = UPPER(p_country_code)
    AND is_active = true;

  RETURN COALESCE(v_currency, 'USD');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if currency is Xendit supported
CREATE OR REPLACE FUNCTION is_xendit_currency(p_currency varchar(3))
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM supported_currencies
    WHERE code = p_currency
      AND xendit_supported = true
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================================
-- STEP 7: Seed initial prices for existing offerings
-- =====================================================================================

-- Insert PHP prices for existing offerings (primary market)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT
  id,
  'PHP',
  CASE
    WHEN base_price IS NOT NULL THEN base_price * 56 -- Approximate USD to PHP conversion
    ELSE 0
  END,
  true
FROM product_offerings
WHERE deleted_at IS NULL
  AND base_price IS NOT NULL
  AND currency = 'USD'
ON CONFLICT (offering_id, currency) DO NOTHING;

-- Insert USD prices for existing offerings (fallback)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT
  id,
  'USD',
  COALESCE(base_price, 0),
  true
FROM product_offerings
WHERE deleted_at IS NULL
  AND base_price IS NOT NULL
ON CONFLICT (offering_id, currency) DO NOTHING;

COMMIT;
