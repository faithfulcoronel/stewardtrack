-- Expand financial_transaction_type enum for double-entry accounting
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'adjustment';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'opening_balance';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'closing_entry';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'fund_rollover';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'reversal';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'allocation';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'reclass';
ALTER TYPE financial_transaction_type ADD VALUE IF NOT EXISTS 'refund';
