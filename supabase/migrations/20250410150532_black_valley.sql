/*
# Financial Transaction Headers

1. New Tables
  - `financial_transaction_headers`
    - `id` (uuid, primary key)
    - `transaction_number` (text, not null) - Unique transaction reference number
    - `transaction_date` (date, not null) - Date of the transaction
    - `description` (text, not null) - Transaction description
    - `reference` (text) - External reference number
    - `source_id` (uuid, foreign key to financial_sources) - Source of funds
    - `status` (text, not null) - Draft, Posted, Voided
    - `posted_at` (timestamptz) - When the transaction was posted
    - `posted_by` (uuid, foreign key to users) - Who posted the transaction
    - `voided_at` (timestamptz) - When the transaction was voided
    - `voided_by` (uuid, foreign key to users) - Who voided the transaction
    - `void_reason` (text) - Reason for voiding
    - `tenant_id` (uuid, foreign key to tenants)
    - Standard audit fields (created_by, updated_by, etc.)

2. Security
  - Enable RLS on `financial_transaction_headers` table
  - Add policies for tenant-based access control
*/

-- Create financial_transaction_headers table
CREATE TABLE IF NOT EXISTS financial_transaction_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  source_id UUID REFERENCES financial_sources(id),
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'posted', 'voided')
  ) DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, transaction_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS financial_transaction_headers_tenant_id_idx ON financial_transaction_headers(tenant_id);
CREATE INDEX IF NOT EXISTS financial_transaction_headers_transaction_date_idx ON financial_transaction_headers(transaction_date);
CREATE INDEX IF NOT EXISTS financial_transaction_headers_status_idx ON financial_transaction_headers(status);
CREATE INDEX IF NOT EXISTS financial_transaction_headers_source_id_idx ON financial_transaction_headers(source_id);
CREATE INDEX IF NOT EXISTS financial_transaction_headers_deleted_at_idx ON financial_transaction_headers(deleted_at);

-- Enable Row Level Security
ALTER TABLE financial_transaction_headers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Financial transaction headers are viewable by tenant users" 
  ON financial_transaction_headers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Financial transaction headers can be inserted by authenticated users" 
  ON financial_transaction_headers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Financial transaction headers can be updated by authenticated users" 
  ON financial_transaction_headers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Financial transaction headers can be deleted by authenticated users" 
  ON financial_transaction_headers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_transaction_headers_updated_at
BEFORE UPDATE ON financial_transaction_headers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Add comment to table
COMMENT ON TABLE financial_transaction_headers IS 'Headers for financial transactions in double-entry accounting system';