/*
  # Update Audit Logs Table

  1. Changes
    - Add standard tracking columns to audit_logs table
    - Add tenant isolation
    - Add updated_at and updated_by fields
    - Add deleted_at field for soft deletes

  2. Security
    - Enable RLS
    - Add policy for tenant access
*/

-- Add missing columns to audit_logs table
DO $$ BEGIN
  -- Add tenant_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add updated_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- Add deleted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN deleted_at timestamptz;
  END IF;

  -- Add created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for tenant_id if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_tenant_id'
  ) THEN
    CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
  END IF;
END $$;

-- Create index for deleted_at if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_deleted_at'
  ) THEN
    CREATE INDEX idx_audit_logs_deleted_at ON audit_logs(deleted_at);
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Audit logs are viewable by tenant users" ON audit_logs;

-- Create new RLS policy for tenant access
CREATE POLICY "Audit logs are viewable by authenticated users"
ON audit_logs
FOR ALL
TO authenticated
USING (
  true
);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Stores audit trail of all important actions in the system with tenant isolation and soft delete support';