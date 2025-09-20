-- Map income_expense_transactions to their financial transactions
CREATE TABLE IF NOT EXISTS income_expense_transaction_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES income_expense_transactions(id) ON DELETE CASCADE,
  transaction_header_id UUID NOT NULL REFERENCES financial_transaction_headers(id) ON DELETE CASCADE,
  debit_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
  credit_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ietm_transaction_id ON income_expense_transaction_mappings(transaction_id);
