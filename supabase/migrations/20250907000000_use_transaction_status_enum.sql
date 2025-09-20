-- 1. Create the enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('draft','submitted','approved','posted','voided');
  END IF;
END $$;

-- 2. Drop the trigger that depends on the 'status' column
DROP TRIGGER IF EXISTS validate_transaction_before_posting_trigger ON financial_transaction_headers;

-- 3. Alter the column to use the new enum type
ALTER TABLE financial_transaction_headers
  DROP CONSTRAINT IF EXISTS financial_transaction_headers_status_check,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE transaction_status USING status::transaction_status,
  ALTER COLUMN status SET DEFAULT 'draft';

-- 4. Recreate the trigger with proper enum casting
CREATE TRIGGER validate_transaction_before_posting_trigger
BEFORE UPDATE ON financial_transaction_headers
FOR EACH ROW
WHEN (
  NEW.status = 'posted'::transaction_status
  AND (OLD.status IS NULL OR OLD.status = 'draft'::transaction_status)
)
EXECUTE FUNCTION validate_transaction_before_posting();

-- 5. Recreate the index for the enum column
DROP INDEX IF EXISTS financial_transaction_headers_status_idx;
CREATE INDEX IF NOT EXISTS financial_transaction_headers_status_idx 
  ON financial_transaction_headers(status);
