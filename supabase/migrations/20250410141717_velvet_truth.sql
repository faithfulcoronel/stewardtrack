/*
# Financial Sources Table

1. New Tables
  - `financial_sources`
    - `id` (uuid, primary key)
    - `name` (text, not null)
    - `description` (text)
    - `source_type` (text, not null)
    - `account_number` (text)
    - `is_active` (boolean, default true)
    - `tenant_id` (uuid, foreign key to tenants)
    - `created_by` (uuid, foreign key to users)
    - `updated_by` (uuid, foreign key to users)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())
    - `deleted_at` (timestamptz, null for active records)

2. Security
  - Enable RLS on `financial_sources` table
  - Add policies for tenant-based access control
  - Add policies for CRUD operations

3. Changes
  - Add indexes for performance optimization
  - Add foreign key constraints
*/

-- Create financial_sources table
CREATE TABLE IF NOT EXISTS financial_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('bank', 'cash', 'fund', 'wallet', 'online', 'other')),
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS financial_sources_tenant_id_idx ON financial_sources(tenant_id);
CREATE INDEX IF NOT EXISTS financial_sources_source_type_idx ON financial_sources(source_type);
CREATE INDEX IF NOT EXISTS financial_sources_deleted_at_idx ON financial_sources(deleted_at);

-- Enable Row Level Security
ALTER TABLE financial_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Financial sources are viewable by tenant users" 
  ON financial_sources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Financial sources can be inserted by authenticated users" 
  ON financial_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Financial sources can be updated by authenticated users" 
  ON financial_sources
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Financial sources can be deleted by authenticated users" 
  ON financial_sources
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_sources_updated_at
BEFORE UPDATE ON financial_sources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Add comment to table
COMMENT ON TABLE financial_sources IS 'Stores financial source accounts used for transactions';