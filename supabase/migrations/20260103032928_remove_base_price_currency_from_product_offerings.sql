-- Migration: Remove base_price and currency from product_offerings
-- These fields are now managed through the product_offering_prices table (multi-currency support)

-- First, migrate any existing base_price/currency data to product_offering_prices if not already there
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT
  po.id,
  COALESCE(po.currency, 'PHP') as currency,
  COALESCE(po.base_price, 0) as price,
  true as is_active
FROM product_offerings po
WHERE po.base_price IS NOT NULL
  AND po.base_price > 0
  AND NOT EXISTS (
    SELECT 1 FROM product_offering_prices pop
    WHERE pop.offering_id = po.id
    AND pop.currency = COALESCE(po.currency, 'PHP')
  );

-- Now remove the columns from product_offerings
ALTER TABLE product_offerings
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS currency;

-- Update the get_offering_price function to not rely on removed columns
CREATE OR REPLACE FUNCTION get_offering_price(
  p_offering_id uuid,
  p_currency varchar(3)
)
RETURNS decimal(15, 2) AS $$
DECLARE
  v_price decimal(15, 2);
BEGIN
  -- Get price from product_offering_prices table
  SELECT price INTO v_price
  FROM product_offering_prices
  WHERE offering_id = p_offering_id
    AND currency = p_currency
    AND is_active = true;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- If no price found for requested currency, try primary currency (PHP)
  SELECT price INTO v_price
  FROM product_offering_prices
  WHERE offering_id = p_offering_id
    AND currency = 'PHP'
    AND is_active = true;

  -- Return the PHP price or NULL if no prices exist
  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment to document the change
COMMENT ON TABLE product_offering_prices IS 'Multi-currency pricing for product offerings. Replaced base_price and currency columns on product_offerings table.';
