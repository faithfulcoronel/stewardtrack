/*
# Add source_id to financial_transactions

1. Changes
  - Add source_id column to financial_transactions table
  - Add foreign key constraint to financial_sources table
  - Add index for performance optimization

2. Security
  - Maintains existing RLS policies
*/

-- Add source_id column to financial_transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'financial_transactions' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN source_id UUID REFERENCES financial_sources(id);
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS financial_transactions_source_id_idx ON financial_transactions(source_id);
    
    -- Add comment
    COMMENT ON COLUMN financial_transactions.source_id IS 'Reference to the financial source used for this transaction';
  END IF;
END $$;