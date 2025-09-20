-- Drop existing foreign key constraints
ALTER TABLE financial_transactions 
  DROP CONSTRAINT IF EXISTS financial_transactions_member_id_fkey;

-- Re-add foreign key constraint with ON DELETE CASCADE
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES members(id) 
  ON DELETE CASCADE;

-- Add comment explaining the cascade delete
COMMENT ON CONSTRAINT financial_transactions_member_id_fkey ON financial_transactions IS 
  'When a member is deleted, automatically delete all their associated transactions';