-- Update AI Credit Package Pricing
-- New pricing structure starting at PHP 99

-- Update PHP packages
UPDATE ai_credit_packages
SET
  credits_amount = 200,
  price = 99.00,
  description = 'Perfect for getting started with AI Assistant'
WHERE currency = 'PHP' AND sort_order = 1;

UPDATE ai_credit_packages
SET
  credits_amount = 1000,
  price = 450.00,
  description = 'Most popular choice for regular users'
WHERE currency = 'PHP' AND sort_order = 2;

UPDATE ai_credit_packages
SET
  credits_amount = 3000,
  price = 1200.00,
  description = 'Best value for active teams and ministries'
WHERE currency = 'PHP' AND sort_order = 3;

UPDATE ai_credit_packages
SET
  credits_amount = 10000,
  price = 3500.00,
  description = 'Maximum credits for large organizations'
WHERE currency = 'PHP' AND sort_order = 4;

-- Update USD packages (approximately 1 USD = 55 PHP)
UPDATE ai_credit_packages
SET
  credits_amount = 200,
  price = 1.80,
  description = 'Perfect for getting started with AI Assistant'
WHERE currency = 'USD' AND sort_order = 1;

UPDATE ai_credit_packages
SET
  credits_amount = 1000,
  price = 8.18,
  description = 'Most popular choice for regular users'
WHERE currency = 'USD' AND sort_order = 2;

UPDATE ai_credit_packages
SET
  credits_amount = 3000,
  price = 21.82,
  description = 'Best value for active teams and ministries'
WHERE currency = 'USD' AND sort_order = 3;

UPDATE ai_credit_packages
SET
  credits_amount = 10000,
  price = 63.64,
  description = 'Maximum credits for large organizations'
WHERE currency = 'USD' AND sort_order = 4;
