-- Add audit columns (created_by, updated_by) to donor_payment_methods table
-- These columns track who created/modified payment method records for audit purposes

ALTER TABLE donor_payment_methods
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add index on created_by for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_donor_payment_methods_created_by
ON donor_payment_methods(created_by);

-- Add index on updated_by for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_donor_payment_methods_updated_by
ON donor_payment_methods(updated_by);

-- Comment the columns for documentation
COMMENT ON COLUMN donor_payment_methods.created_by IS 'User ID who created this payment method record';
COMMENT ON COLUMN donor_payment_methods.updated_by IS 'User ID who last updated this payment method record';
