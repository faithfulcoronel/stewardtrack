-- Add created_by and updated_by columns to members table
ALTER TABLE members
ADD COLUMN created_by uuid REFERENCES auth.users(id),
ADD COLUMN updated_by uuid REFERENCES auth.users(id);

-- Add updated_by column to budgets table
ALTER TABLE budgets
ADD COLUMN updated_by uuid REFERENCES auth.users(id);

--Add updated_by column to financial_transactions table
ALTER TABLE financial_transactions
ADD COLUMN updated_by uuid REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_members_updated_by ON members(updated_by);
CREATE INDEX IF NOT EXISTS idx_budgets_updated_by ON budgets(updated_by);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_updated_by ON financial_transactions(updated_by);

-- Update trigger function to handle updated_by
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for member changes
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add helpful comments
COMMENT ON COLUMN members.created_by IS 'The user who created this member';
COMMENT ON COLUMN members.updated_by IS 'The user who last updated this member';
COMMENT ON COLUMN budgets.updated_by IS 'The user who last updated this budgets';
COMMENT ON COLUMN financial_transactions.updated_by IS 'The user who last updated this financial_transactions';


-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be created by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be updated by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by authenticated users" ON members;


-- Create simplified RLS policies for members
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be created by authenticated users"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = created_by)
  );

CREATE POLICY "Members can be updated by authenticated users"
  ON members FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = updated_by)
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be deleted by authenticated users"
  ON members FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_current_tenant_id()
  );

-- Add helpful comments
COMMENT ON FUNCTION get_user_current_tenant_id IS
  'Returns the current tenant ID for the authenticated user';

COMMENT ON POLICY "Members are viewable by authenticated users" ON members IS
  'Authenticated users can view members within their tenant';

COMMENT ON POLICY "Members can be created by authenticated users" ON members IS
  'Authenticated users can create members within their tenant';

COMMENT ON POLICY "Members can be updated by authenticated users" ON members IS
  'Authenticated users can update members within their tenant';

COMMENT ON POLICY "Members can be deleted by authenticated users" ON members IS
  'Authenticated users can delete members within their tenant';
